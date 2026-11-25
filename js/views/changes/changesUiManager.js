import ChangesUIRecordClass from "./changesUIRecordClass.js";

export class ChangesUiManager {

    constructor(element, connector, manager) {
        this.element = element
        //changesmanager does the change models and so.
        this.changesManager = manager;
        this.connector = connector
        this.setDate(connector.date)
        this.scroller = new ChangesUIScroller()

    }

    setDate(date) {
        this.date = date
    }

    makeTable() {
        let yearsOfEducation = Object.keys(this.connector.yearsOfEducation).sort()
        let timeslots = Object.values(this.connector.timeslots).sort((a, b) => a.rank - b.rank)

        // Filter out U11 (rank 11) timeslot for display
        timeslots = timeslots.filter(slot => slot.rank !== 11);

        let container = document.createElement('div')
        container.classList.add("schedule-container", "schedule-flex")
        container.style.setProperty('--years-of-education', yearsOfEducation.at(-1));
        container.style.setProperty('--timeslots', timeslots.at(-1).rank);
        //set css variables
        let year_row = document.createElement('div')
        year_row.classList.add("year-row", "schedule-flex", "header")
        let node = document.createElement('div');
        node.classList.add("schedule-flex", "year-header")
        year_row.append(node)
        container.append(year_row)

        let timeslots_box = document.createElement('div')
        timeslots_box.classList.add("schedule-content-container")
        timeslots_box.classList.add("timeslot-container")
        timeslots_box.classList.add("schedule-flex")
        year_row.append(timeslots_box)
        timeslots.forEach(slot => {
            let el = document.createElement('div')
            el.classList.add("timeslot-header")
            el.innerHTML = slot.name
            el.setAttribute('data-timeslot', slot.rank)
            timeslots_box.append(el)
        })

        yearsOfEducation.forEach(year => {
            let el = document.createElement('div')
            el.classList.add("year-row", "schedule-flex")
            let year_cell = document.createElement('div')
            year_cell.classList.add("schedule-flex", "header", "year-header")
            // Change year display to show "lj 1", "lj 2", etc.
            year_cell.innerHTML = `lj ${year}`
            el.append(year_cell)

            let content_cell = document.createElement('div')
            content_cell.classList.add("schedule-content", "schedule-flex")
            el.append(content_cell)
            let content_container = document.createElement('div')
            content_container.classList.add("schedule-content-container")
            content_container.id = "schedule-content-year-" + year
            content_cell.append(content_container)
            container.append(el)
        })
        this.element.append(container)
        this.scroller.start()
    }

    fillTable() {
        const changes = []
        const appointments = Object.values(this.changesManager.appointments)
            .filter(app => app.groupsInDepartments && app.groupsInDepartments.length)

        // Activities take precedence over lessons in the same cell.
        const activityCoverage = new Set()
        const coverageKey = (group_id, period) => group_id + ":" + period

        const addActivities = (apps) => {
            apps.forEach(appointment => {
                appointment.groupsInDepartments.forEach(group_id => {
                    const group = this.connector.getGroupInDepartment(group_id)
                    const department = this.connector.getDepartmentOfBranch(group.departmentOfBranch)

                    let fullyCovered = true
                    for (let period = appointment.startTimeSlot; period <= appointment.endTimeSlot; period++) {
                        if (!activityCoverage.has(coverageKey(group_id, period))) {
                            fullyCovered = false
                            break
                        }
                    }
                    if (fullyCovered) {
                        return
                    }

                    changes.push(new ChangesUIRecordClass(group, department, appointment.startTimeSlot, appointment.endTimeSlot, appointment))
                    for (let period = appointment.startTimeSlot; period <= appointment.endTimeSlot; period++) {
                        activityCoverage.add(coverageKey(group_id, period))
                    }
                })
            })
        }

        addActivities(appointments.filter(app => app.type === 'activity' && app.valid && !app.cancelled))
        addActivities(appointments.filter(app => app.type === 'activity' && app.valid && app.cancelled))

        // Group lesson versions by group + period so a cancellation and the
        // lesson that replaces it can be shown as one card.
        const buckets = new Map()
        const addLessons = (apps, kind) => {
            apps.forEach(appointment => {
                appointment.groupsInDepartments.forEach(group_id => {
                    const group = this.connector.getGroupInDepartment(group_id)
                    const department = this.connector.getDepartmentOfBranch(group.departmentOfBranch)

                    for (let period = appointment.startTimeSlot; period <= appointment.endTimeSlot; period++) {
                        if (activityCoverage.has(coverageKey(group_id, period))) {
                            continue
                        }

                        const key = coverageKey(group_id, period)
                        let bucket = buckets.get(key)
                        if (!bucket) {
                            bucket = {group, department, period, current: [], cancelled: [], invalid: []}
                            buckets.set(key, bucket)
                        }
                        bucket[kind].push(appointment)
                    }
                })
            })
        }

        addLessons(appointments.filter(app => app.type === 'lesson' && app.valid && !app.cancelled), 'current')
        addLessons(appointments.filter(app => app.type === 'lesson' && app.valid && app.cancelled), 'cancelled')
        addLessons(appointments.filter(app => app.type === 'lesson' && !app.valid), 'invalid')

        const items = []
        buckets.forEach(bucket => {
            const current = bucket.current[0]
            const cancelled = bucket.cancelled[0]

            if (current) {
                // Same group and period: the new lesson replaces the old one.
                const replaced = cancelled ? {appointment: cancelled, entity: bucket.group} : null
                items.push({bucket, current, replaced})
            } else if (cancelled) {
                items.push({bucket, cancelled})
            }
        })

        // Sometimes Zermelo keeps the old version of the same appointment
        // instance instead of a separate cancellation. The group can change
        // too (a2a.en -> a2a.fa), so look this up across buckets.
        const invalidVersions = []
        const seenInvalid = new Set()
        buckets.forEach(bucket => {
            bucket.invalid.forEach(appointment => {
                if (seenInvalid.has(appointment.id)) {
                    return
                }
                seenInvalid.add(appointment.id)
                invalidVersions.push({appointment, entity: bucket.group})
            })
        })
        invalidVersions.sort((a, b) => (b.appointment.lastModified || 0) - (a.appointment.lastModified || 0))

        items.filter(item => item.current && !item.replaced).forEach(item => {
            const oldVersion = invalidVersions.find(version =>
                version.appointment.appointmentInstance === item.current.appointmentInstance &&
                this.#isDifferentLesson(version.appointment, item.current)
            )
            if (oldVersion) {
                item.replaced = oldVersion
            }
        })

        // A language switch can move students to a different cluster group,
        // e.g. a2a.en -> a2a.fa. Those share the same student list, so pair
        // them when there is exactly one candidate in the same period.
        const currentItems = items.filter(item => item.current)
        items.filter(item => item.cancelled).forEach(cancelItem => {
            const candidates = currentItems.filter(item => {
                if (item.replaced ||
                    item.bucket.period !== cancelItem.bucket.period ||
                    item.bucket.department.id !== cancelItem.bucket.department.id) {
                    return false
                }

                if (this.#sameArray(item.current.students, cancelItem.cancelled.students)) {
                    return true
                }

                // Fallback when student lists are not available.
                return !item.current.students?.length &&
                    !cancelItem.cancelled.students?.length &&
                    this.#classPrefix(item.bucket.group) &&
                    this.#classPrefix(item.bucket.group) === this.#classPrefix(cancelItem.bucket.group)
            })

            if (candidates.length === 1) {
                candidates[0].replaced = {appointment: cancelItem.cancelled, entity: cancelItem.bucket.group}
                cancelItem.consumed = true
            }
        })

        items.forEach(item => {
            if (item.current) {
                changes.push(new ChangesUIRecordClass(
                    item.bucket.group,
                    item.bucket.department,
                    item.bucket.period,
                    item.bucket.period,
                    item.current,
                    item.replaced
                ))
            } else if (item.cancelled && !item.consumed) {
                changes.push(new ChangesUIRecordClass(
                    item.bucket.group,
                    item.bucket.department,
                    item.bucket.period,
                    item.bucket.period,
                    item.cancelled
                ))
            }
        })

        changes.sort((a, b) => {
            if (a.appointment.type !== b.appointment.type) {
                if (a.appointment.type === 'lesson') {
                    //activities voor lessen
                    return 1
                } else {
                    return -1
                }
            } else if (a.entity !== b.entity) {
                if (a.entity.extendedName > b.entity.extendedName) {
                    return 1
                } else {
                    return -1
                }
            }
            return 0
        }).forEach(change => {
            let container = document.querySelector("#schedule-content-year-" + change.departmentOfBranch.yearOfEducation)
            container.append(change.getElement())

        })
    }

    #isDifferentLesson(a, b) {
        const subjectsA = (a.subjects || []).slice().sort()
        const subjectsB = (b.subjects || []).slice().sort()
        const groupsA = (a.groups || []).slice().sort()
        const groupsB = (b.groups || []).slice().sort()

        return JSON.stringify(subjectsA) !== JSON.stringify(subjectsB) ||
            JSON.stringify(groupsA) !== JSON.stringify(groupsB)
    }

    #classPrefix(entity) {
        const name = entity.name || entity.extendedName || ""
        return name.split(/[.\s_-]/)[0].toLowerCase() || null
    }

    #sameArray(a, b) {
        const listA = (a || []).slice().sort()
        const listB = (b || []).slice().sort()
        return listA.length > 0 && JSON.stringify(listA) === JSON.stringify(listB)
    }

    async refreshTable() {
        //TODO: this is quick n dirty way to show the new changes

        try{
            var changes = await this.changesManager.loadData()
        }
        catch (e){
            console.error(e)
            return;

        }
        if (Object.keys(changes).length) {
            this.scroller.stop()
            this.element.innerHTML = ""
            this.makeTable()
            this.fillTable()

        }

    }
}

class ChangesUIScroller{
    constructor() {
        this.largest = 0
        this.timeout = undefined;
    }

    start(){
        this.reset()
        let animate = function(largest){
            let duration = (largest.scrollHeight - largest.clientHeight)*150
            $(".schedule-content").animate({scrollTop: largest.scrollHeight - largest.clientHeight}, {duration: duration}).promise().then(()=>
                {
                    setTimeout(()=>{

                        $(".schedule-content").animate({scrollTop: 0}, {duration: 300}).promise().done(()=>animate(largest))

                    },1000)
                }
            );

        }
        animate(this.largest);
    }

    stop(){
        $(".schedule-content").stop()
    }

    reset(){
        this.largest = undefined;
        $(".schedule-content").each((index, el) => {
            if(this.largest === undefined){
                this.largest = el
            }
            else if (this.largest.scrollHeight < el.scrollHeight) {
                this.largest = el.scrollHeight
            }
        });
    }
}
