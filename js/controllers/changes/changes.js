import ChangedRecordHolder from "./lib/changedRecordHolder.js";
import {mergeSubsequentAppointments, arraysEqual} from "../../zermelo/utils/mergeAppointments.js";

class Changes {
    #date;
    #appointments;


    #schoolInYear

    //afdeling-jaarlaag (dus A3 is 1 department)


    //klassen en clusters

    #appointmentCategories;
    #mergeMultipleHourSpan;


    constructor(connector, options={}) {
        this.connector = connector


        options = {
            ...{
                merge_multiple_hour_span: true
            },
            ...options
        }

        //bool, do yyou want to merge lessons that span more hours?
        this.#mergeMultipleHourSpan = options.merge_multiple_hour_span

        //array with strings with codes from departments we want to ignore to decide if a whole year has this appointment

        this.#appointments = {}




        this.#appointmentCategories = {
            "activities": {
                options: {type: 'activity'},
                lastModified: 0
            },
            // `modified` is deprecated in the Zermelo API. `changed` is the
            // supported filter for appointments with changes.
            "changed": {
                options: {changed: true},
                lastModified: 0
            },
            "cancelled": {
                options: {cancelled: true},
                lastModified: 0
            },
            "invalid": {
                options: {valid: false},
                lastModified: 0
            }

        }

        //TODO: remove this
        window.ad = this.#appointments
    }



    get appointments(){
        return this.#appointments
    }
    reset(){
        Object.keys(this.#appointmentCategories).forEach(key =>{
            this.#appointmentCategories[key].lastModified = 0;
        })
        this.#appointments = {}
    }

    async loadData(){
        //TODO: remove debug props

        let common_data = {
            branchOfSchool: this.connector.branch.id,
            type: 'lesson',
            fields: ["id","appointmentInstance", "start", "end", "startTimeSlot", "endTimeSlot", "type", "groups", "groupsInDepartments", "locations", "cancelled", "cancelledReason", "modified", "teacherChanged", "groupChanged", "locationChanged", "timeChanged", "moved", "hidden", "changeDescription", "schedulerRemark", "lastModified", "base", "courses", "appointmentLastModified", "remark", "subjects", "teachers","valid", "students"],
            start: this.connector.date.getStartOfDayTime()/1000,
            end:this.connector.date.getEndOfDayTime()/1000
        }


        let category_promises = {}
        let categories_names = Object.keys(this.#appointmentCategories)
        categories_names.forEach(category_name =>{
            category_promises[category_name] = this.connector.api.appointments.get({...common_data, ...this.#appointmentCategories[category_name].options, ...{modifiedSince: this.#appointmentCategories[category_name].lastModified}})
        }, this)

        // Zermelo can create a replacement lesson without marking it as
        // changed or new: it is copied as a "base" appointment. Fetch the
        // current timetable as a reference so those replacements can be found.
        let schedule_promise = this.connector.api.appointments.get({...common_data, valid: true})

        // A single optional category must not prevent the rest of the changes
        // from loading.
        let [nameless_results, schedule] = await Promise.all([
            Promise.all(
                Object.entries(category_promises).map(([name, promise]) =>
                    promise.catch(error => {
                        console.warn("Could not load " + name + " appointments", error)
                        return []
                    })
                )
            ),
            schedule_promise.catch(error => {
                console.warn("Could not load the current timetable", error)
                return []
            })
        ])
        let category_results ={}
        categories_names.forEach((name, index) =>{
            category_results[name] = nameless_results[index]
        })

        let modified_appointments = {}

        categories_names.forEach(category=>{
            category_results[category].forEach(appointment => {
                if(appointment.lastModified > window.pretendLikeIts){
                    return;
                }
                modified_appointments[appointment.id] = appointment
                if(appointment.lastModified > this.#appointmentCategories[category].lastModified){
                    this.#appointmentCategories[category].lastModified = appointment.lastModified
                }
            })
        })

        if(this.#mergeMultipleHourSpan){
            modified_appointments =  mergeSubsequentAppointments(Object.values(modified_appointments))
            //this.#combineSpansMultipleHours(modified_appointments)
        } else {
            modified_appointments = Object.values(modified_appointments)
        }

        modified_appointments = this.#addReplacementLessons(modified_appointments, schedule)

        modified_appointments.forEach(appointment=>{
            //bepalen of er hele afdelingen en/of jaarlagen in zitten
            //years heeft jaren als key en array met departments als value
            let years = {}
            //department id als key en array met groepen als value
            let departments = {}

            appointment.groupsMain = []
            appointment.groupsOther = []

            appointment.departmentComplete = []
            appointment.groupsWithoutCompleteDepartment = []

            appointment.groupsInDepartments.forEach(group_id=>{
                let group = this.connector.groupsInDepartment[group_id]
                if(group.isMainGroup){
                    appointment.groupsMain.push(group_id)
                }else{
                    appointment.groupsOther.push(group_id)
                }

                let department = this.connector.departments[group.departmentOfBranch]

                if(!departments[department.id]){
                    departments[department.id] = []
                }
                departments[department.id].push(group.id)
            })


            Object.keys(departments).forEach(department_id=>{
                department_id = Number(department_id)
                let appointment_groups = departments[department_id].sort()
                let department = this.connector.departments[department_id];
                let department_groups = department.mainGroupsInDepartment.sort()
                if(appointment_groups.length === department_groups.length && JSON.stringify(appointment_groups) === JSON.stringify(department_groups)){
                    appointment.departmentComplete.push(department_id)
                    if(!years[department.yearOfEducation]){
                        years[department.yearOfEducation] = []
                    }
                    years[department.yearOfEducation].push(department_id)
                    //if(appointment_groups.length > 1){debugger;}
                }
                else {
                    appointment.groupsWithoutCompleteDepartment = appointment.groupsWithoutCompleteDepartment.concat(appointment_groups)
                }
            })

            let whole_years = []
            appointment.yearsComplete = []
            appointment.departmentsNotInCompleteYear = []
            Object.keys(years).forEach(year=>{

                let departments_in_year = this.connector.yearsOfEducation[year].sort()
                let departments_in_appointment = years[year].sort()
                //if(departments_in_appointment.length > 1){debugger;}
                if(departments_in_year.length === departments_in_appointment.length && JSON.stringify(departments_in_year) === JSON.stringify(departments_in_appointment)){
                    appointment.yearsComplete.push(year)
                    //debugger;
                }
                else{
                    appointment.departmentsNotInCompleteYear =  appointment.departmentsNotInCompleteYear.concat(departments_in_appointment)
                }

            })



        })

        // Keep previously loaded changes in the replacement lookup. A
        // cancellation may already have been shown before the full timetable
        // was available.
        const existingIds = new Set(Object.keys(this.#appointments))
        const all_appointments = {}
        Object.values(this.#appointments).forEach(app => all_appointments[app.id] = app)
        modified_appointments.forEach(app => all_appointments[app.id] = app)

        let all_with_replacements = this.#addReplacementLessons(Object.values(all_appointments), schedule)
        if (this.#mergeMultipleHourSpan) {
            all_with_replacements = mergeSubsequentAppointments(all_with_replacements)
        }

        const all_objects = {}
        all_with_replacements.forEach(app => all_objects[app.id] = app)

        Object.keys(this.#appointments).forEach(id => delete this.#appointments[id])
        Object.assign(this.#appointments, all_objects)

        const updatedIds = new Set(modified_appointments.map(app => String(app.id)))
        const addedReplacements = all_with_replacements.filter(app =>
            !existingIds.has(String(app.id)) && !updatedIds.has(String(app.id))
        )

        return [...modified_appointments, ...addedReplacements]
    }

    #addReplacementLessons(changes, schedule) {
        const cancelled = changes.filter(app =>
            app.type === 'lesson' && app.valid && app.cancelled
        )
        if (!cancelled.length) {
            return changes
        }

        const current = schedule.filter(app =>
            app.type === 'lesson' && app.valid && !app.cancelled
        )
        const existingIds = new Set(changes.map(app => app.id))

        cancelled.forEach(oldAppointment => {
            current.forEach(newAppointment => {
                if (existingIds.has(newAppointment.id)) {
                    return
                }
                if (!this.#isReplacementCandidate(oldAppointment, newAppointment)) {
                    return
                }

                changes.push(newAppointment)
                existingIds.add(newAppointment.id)
            })
        })

        return changes
    }

    #isReplacementCandidate(oldAppointment, newAppointment) {
        if (!this.#periodsOverlap(oldAppointment, newAppointment)) {
            return false
        }

        // Same group and period: a group cannot follow two lessons at once,
        // so this is the replacement for the cancelled lesson.
        if (this.#sameArray(oldAppointment.groupsInDepartments, newAppointment.groupsInDepartments)) {
            return true
        }

        // Cluster switch, e.g. a2a.en -> a2a.fa: the group id changes but the
        // students stay the same.
        return this.#sameArray(oldAppointment.students, newAppointment.students) &&
            this.#isDifferentLesson(oldAppointment, newAppointment)
    }

    #periodsOverlap(a, b) {
        return a.startTimeSlot <= b.endTimeSlot && b.startTimeSlot <= a.endTimeSlot
    }

    #sameArray(a, b) {
        const listA = (a || []).slice().sort()
        const listB = (b || []).slice().sort()
        return listA.length > 0 && JSON.stringify(listA) === JSON.stringify(listB)
    }

    #isDifferentLesson(a, b) {
        const subjectsA = (a.subjects || []).slice().sort()
        const subjectsB = (b.subjects || []).slice().sort()
        const groupsA = (a.groups || []).slice().sort()
        const groupsB = (b.groups || []).slice().sort()

        return JSON.stringify(subjectsA) !== JSON.stringify(subjectsB) ||
            JSON.stringify(groupsA) !== JSON.stringify(groupsB)
    }

}


export { Changes }
