import {ZermeloApi} from "./zermelo/zermelo.js";
import {Changes} from "./controllers/changes/changes.js";
import Absences from "./controllers/absences/absences.js";
import {ZermeloAuthorizationError} from "./zermelo/utils/errors.js";
import ZermeloConnector from "./connectors/zermeloConnector.js";
import {ChangesUiManager} from "./views/changes/changesUiManager.js";
import AbsenceEntity from "./controllers/absences/absenceEntity.js";
import {AbsencesUiManager} from "./views/absences/absencesUiManager.js";
import OutOfOffice from "./controllers/outofoffice/outOfOffice.js";
import {OutOfOfficeUiManager} from "./views/outOfOffice/outOfOfficeUiManager.js";

let params = new URLSearchParams(window.location.search)

var zapi = new ZermeloApi({
    portal: params.get("portal"),
    token: params.get("token"),
    branch: params.get("branch")
});



$(document).ready(function () {
    let params = new URLSearchParams(window.location.search)
    let param_date = params.get("date");
    let param_branch = params.get("branch");
    let param_ignore = params.get("departmentsIgnore");
    let param_merge = params.get("mergeAppointments")
    let param_external = params.get("external")
    param_external = param_external ? param_external : "extern"


    // Support relative date keywords in query param (today/tomorrow & vandaag/morgen)
    let relativeDateLabel = null;
    let resolvedParamDate = param_date;
    if (param_date) {
        const lower = param_date.toLowerCase();
        const now = new Date();
        let target = null;
        if (lower === "tomorrow" || lower === "morgen") {
            target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            relativeDateLabel = "morgen";
        } else if (lower === "today" || lower === "vandaag") {
            target = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            relativeDateLabel = "vandaag";
        }
        if (target) {
            const dd = String(target.getDate()).padStart(2, '0');
            const mm = String(target.getMonth() + 1).padStart(2, '0');
            const yyyy = target.getFullYear();
            resolvedParamDate = `${dd}-${mm}-${yyyy}`;
        }
    }


    let connector = new ZermeloConnector(zapi,resolvedParamDate ? resolvedParamDate : undefined, {branch: param_branch? param_branch : undefined, ignore_departments:param_ignore ? param_ignore.split(",") : []})
    AbsenceEntity.Connector = connector

    var changesManager = new Changes(connector, {
        merge_multiple_hour_span: !(param_merge && param_merge === "false")
    });
    var changesUiManager = new ChangesUiManager(document.querySelector("#content-container"), connector, changesManager)

    var absences = new Absences(connector)
    var absencesUiManager = new AbsencesUiManager(document.querySelector("#absences-container>div"),connector,absences);


    var outofoffice = new OutOfOffice(connector)
    var outOfOfficeUiManager = new OutOfOfficeUiManager(document.querySelector("#outofoffice-inner-container"),connector,outofoffice)

    window.cm = changesUiManager
    window.zc = connector

    const setTitle = (dateObj) => {
        const label = relativeDateLabel ? ` (${relativeDateLabel})` : '';
        $("#title").text("Roosterwijzigingen" + label + " " + dateObj.toLocaleString("nl-NL", {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }))
    }

    let dayChanged = function(){
        changesManager.reset()
        changesUiManager.refreshTable()
        setTitle(connector.date) // Updates the title with the new date in format 'Roosterwijzigingen maandag 1 december 2025'
    }
    window.dc = dayChanged

    connector.waitUntilReady().then(a=>{
        changesManager.loadData().then(cm => {
            changesUiManager.makeTable();
            changesUiManager.fillTable();
            var last_checked_date = new Date();
            setInterval(()=> {

                let new_date = new Date();
                if(last_checked_date.getDate() < new_date.getDate()){
                    //FIXME: now we do a hard reload
                    location.reload()
                    let diff = Math.round((new_date.getTime() - last_checked_date.getTime())/ (1000 * 3600 * 24));
                    let new_date_obk = new Date(connector.date)
                    new_date_obk.setDate(new_date_obk.getDate() + diff);
                    last_checked_date = new_date;
                    connector.setDate(new_date_obk).then(a=>{
                        changesManager.reset()
                        setTitle(connector.date)
                        absences.reset()

                    })

                }
                changesUiManager.refreshTable();

            }, 5*60*1000)
        })
        absencesUiManager.refresh().then(a=>{
            setInterval(()=>{
                absencesUiManager.refresh();
            }, 5*60*1000)
            document.querySelector("#absences-container").style.display = null
            }).catch(err=>{
            if(err instanceof ZermeloAuthorizationError){
                console.warn("No authorization for absences")

            }
            else {
                throw err
            }
        });

        connector.waitUntilReady().then(a=> outofoffice.setExternalLocationName(param_external)).catch(err=>console.error(err))
            .then(a=> outofoffice.loadAll())
            .then(items=>{
                if(outofoffice.outOfOffices.length){
                    document.querySelector("#outofoffice-container").style.display = null
                }
                outOfOfficeUiManager.refresh()
                setInterval(()=>{
                    outOfOfficeUiManager.refresh();
                    if(outofoffice.outOfOffices.length){
                        document.querySelector("#outofoffice-container").style.display = null
                    }
                    else{
                        document.querySelector("#outofoffice-container").style.display = "none"
                    }
                }, 5*60*1000)
            })


    })
    setTitle(connector.date)
});
