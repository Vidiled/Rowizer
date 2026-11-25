import {ChangesUIRecord} from "./changesUIRecord.js";

export default class ChangesUIRecordClass extends ChangesUIRecord {
    constructor(group, department, period, period_end, appointment, replaced = null) {
        super(group, department, period, period_end, appointment);
        this.replaced = replaced;
    }

    renderContent(el) {
        if (!this.replaced || !this.replaced.appointment) {
            el.innerText = this.getInnerText();
            return;
        }

        const oldAppointment = this.replaced.appointment;
        const oldEntity = this.replaced.entity || this.entity;
        const sameEntity = oldEntity.id === this.entity.id;
        const sameClass = !sameEntity &&
            this.#classPrefix(oldEntity) &&
            this.#classPrefix(oldEntity) === this.#classPrefix(this.entity);

        const oldSubject = this.#subjectText(oldAppointment);
        const newSubject = this.#subjectText(this.appointment);
        const details = this.#detailsText(this.appointment);

        // Keep the same single-line card style as every other appointment:
        // old subject struck through, arrow, then the new lesson details.
        const oldGroup = document.createElement("span");
        oldGroup.textContent = sameClass ? this.#classLabel(this.entity) : this.#entityLabel(oldEntity);
        el.append(oldGroup);

        if (oldSubject) {
            const oldSubjectEl = document.createElement("span");
            oldSubjectEl.classList.add("replacement-old-subject");
            oldSubjectEl.textContent = " " + oldSubject;
            el.append(oldSubjectEl);
        }

        const arrow = document.createElement("span");
        arrow.classList.add("replacement-arrow");
        arrow.textContent = " → ";
        el.append(arrow);

        if (!sameEntity && !sameClass) {
            const newGroup = document.createElement("span");
            newGroup.textContent = this.#entityLabel(this.entity) + " ";
            el.append(newGroup);
        }

        if (newSubject) {
            const newSubjectEl = document.createElement("span");
            newSubjectEl.classList.add("replacement-new-subject");
            newSubjectEl.textContent = newSubject;
            el.append(newSubjectEl);
        }

        if (details) {
            const detailsEl = document.createElement("span");
            detailsEl.classList.add("replacement-details");
            detailsEl.textContent = " " + details;
            el.append(detailsEl);
        }

        el.title = [
            this.#entityLabel(oldEntity),
            oldSubject,
            "vervalt",
            "→",
            this.#entityLabel(this.entity),
            newSubject,
            details
        ].filter(Boolean).join(" ");
    }

    getInnerText() {
        let str = ""
        if (this.entity.isMainGroup) {
            str += this.entity.name + " "
        } else {
            str += this.entity.extendedName + " "
        }


        if (!this.appointment.cancelled && this.appointment.valid) {
            //dit gaat door
            if(this.appointment.type === "activity"){
                str += this.appointment.subjects[0].replace("_", " ")
                str += " "

            } else {
                if (this.entity.isMainGroup) {
                    str += this.appointment.subjects[0].substring(0, 6)
                    if (this.appointment.subjects.length > 1) {
                        str += "+" + (this.appointment.subjects.length - 1).toString()
                    }
                    str += " "
                }

            }

            str += this.appointment.teachers.slice(0, 2).join(",")
            if (this.appointment.teachers.length > 2) {
                str += "+" + (this.appointment.teachers.length - 1).toString()
            }
            str += " "

            if (this.appointment.locations.length) {
                str += this.appointment.locations.sort((a,b)=>a.length-b.length)[0]
            }

        } else {
            if (this.appointment.type === 'activity') {
                str += "act vervalt"
            }
            if (this.appointment.type === 'lesson') {
                str += "vervalt"
            }
        }
        return str
    }

    #entityLabel(entity) {
        if (entity.isMainGroup) {
            return entity.name || "";
        }
        return entity.extendedName || entity.name || "";
    }

    #classLabel(entity) {
        const name = entity.name || entity.extendedName || "";
        return name.split(/[.\s_-]/)[0] || this.#entityLabel(entity);
    }

    #classPrefix(entity) {
        return this.#classLabel(entity).toLowerCase();
    }

    #subjectText(appointment) {
        const subject = appointment.subjects?.[0]?.replace("_", " ");
        if (!subject) {
            return "";
        }

        return subject.substring(0, 10);
    }

    #detailsText(appointment) {
        const teachers = this.#teacherText(appointment);
        const location = this.#locationText(appointment);
        return [teachers, location].filter(Boolean).join(" ");
    }

    #teacherText(appointment) {
        const teachers = appointment.teachers || [];
        if (!teachers.length) {
            return "";
        }

        let text = teachers.slice(0, 2).join(",");
        if (teachers.length > 2) {
            text += "+" + (teachers.length - 2);
        }
        return text;
    }

    #locationText(appointment) {
        const locations = appointment.locations || [];
        if (!locations.length) {
            return "";
        }

        return [...locations].sort((a, b) => a.length - b.length)[0];
    }
}
