# Rowizer - Zermelo Schedule Change Visualization

> **This is an adaptation** of the original Rowizer project created by **Xinne van der Oord** at **Vlietland College**.
> This fork has been customized for use at a different school group with additional features and customizations.
> See [the original repository](https://github.com/vlietland-college/Rowizer) for the base version.

## Overview

With the growing call to ban phones from schools an ancient, almost forgotten concept is on the rise again: a method 
to view today's changes on a screen. This project aims to provide a simple, secure and free way to show relevant 
information on screens. 

Rowizer: 
- Determines the actual impact the changes have on the schedule: only relevant information[^1] is shown - no endless lists of changes. 
- Highlights new changes (made after 8AM)
- Always shows activities in green 
- Automatically fetches new changes from Zermelo
- Shows absent teachers 
- Scroll if there are too many changes



[^1]:  Cluster changes are currently always shown, in the future only relevant changes will appear. Eg: If entl4 with students X and Y is cancelled but biol1 (taken by student X) and ges2 (student Y) are moved to that period, the entl4 cancellation will not be shown - all students know where they have to go.

![Screenshot of a live Rowizer example](/assets/img/example.png)

## Try a demo
[Try a live demo!](https://vlietland-college.github.io/Rowizer?token=ec2h7u9cd612a1gr11q5k1a4ou&portal=j9qeq&date=19-6-2024&branch=a). The data is fetched from the original development portal.

## Customizations in this fork

This adaptation includes:
- **Dynamic gradient backgrounds**: Customize the background gradient colors via URL parameters
- **Automatic color contrast**: The highlight color for new appointments is automatically computed to contrast well with your chosen background
- **Enhanced styling**: Improved visual styling for appointments and UI elements 

## How to use?
So, you're an BIP or ASP and would like to try Rowizer? It will only take a minute and is completely free! And, since the application runs 100% in-browser, no data is sent to any servers (well, except Zermelo, but we trust them) so no need for any signatures!

### Get an API-token
[Zermelo has written a nice how-to](https://support.zermelo.nl/guides/applicatiebeheerder/koppelingen/overige-koppelingen-2/koppeling-met-overige-externe-partijen#stap_1_gebruiker_toevoegen)! 
> [!TIP]
> If you don't want to show the absent teachers don't add the "Afwezigen" authorization. Rowizer detects this automatically

### URL Parameters for testing
All settings are done by using URL-parameters. Only two (or three, if your school has multiple branches) are really needed to start: the token and the portal id (the part before .zportal.nl)
```
https://vlietland-college.github.io/Rowizer?token={API_TOKEN_HERE}&portal={PORTAL_NAME_HERE}
```
If you have multiple branches, add:
```
&branch={BRANCH_CODE_HERE}
```
Rowizer will automatically show today. If you want to try another day, use the `date` parameter with DD-MM-YYYY format, or use the relative keywords `today`/`vandaag` and `tomorrow`/`morgen`:
```
&date=19-6-2024
```
or
```
&date=tomorrow
```
The page title will indicate this with “(vandaag)” or “(morgen)”.
```

> [!WARNING]
> Rowizer is designed for (big) TV screens. The best result is achieved when using a 50 inch or lager 4K screen. 


## URL Parameters
|Parameter| Example value              | required           | Description                                                                                                                                                                                                                                                                                                                                                                                |
|------|----------------------------|--------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|portal| j9qeq                      | x                  | The zportal ID (so the part before .zportal.nl                                                                                                                                                                                                                                                                                                                                             |
|token| ec2h7u9cd612a1gr11q5k1a4ou | x                  | The API-token [generated](https://support.zermelo.nl/guides/applicatiebeheerder/koppelingen/overige-koppelingen-2/koppeling-met-overige-externe-partijen) in your Zermelo portal                                                                                                                                                                                                           |
|branch| a                          | if multiple branches | The branch code (vestigingscode) found in Portal inrichting -> Vestigingen                                                                                                                                                                                                                                                                                                                 |
|date| 22-03-2024                 | | Use a specific date (DD-MM-YYYY) or the relative keywords `today`/`vandaag` and `tomorrow`/`morgen`. The title will show “(vandaag)” or “(morgen)” when these are used.                                                                                                                                                                                                                    |
|external| extern                     | | If you the location with this name to an appointment, Rowizer will show the attending teachers just below the absent ones. This way, students will quickly see that a certain teacher is not available at school.                                                                                                                                                                          |
|departmentsIgnore| kopkl,vavo                 || Some departments should not be taken into consideration while determining if a whole education or yearOfEducation is present in an appointment.                                                                                                                                                                                                                                            |
|mergeAppointments| false                      | | Before Zermelo 24.07 apoointments that span multiple periods were published as seperate appointments. (See [the release docs](https://support.zermelo.nl/news/posts/release-2407#wat_is_een_publicatieblokn)). If this parameter is omitted or set to anything but 'false', Rowizer automatically merges these appointments based on successive periods and identical teachers and groups. 
|bgColor1| FF5733                     | | First gradient color for the background (hex color without #). Defaults to #020738
|bgColor2| 2E86AB                     | | Second gradient color for the background (hex color without #). Defaults to #4e395c. The highlight color for new appointments is automatically computed based on the average of these colors. 
|absences| false                       | | Set to `false` to hide the Absences (Afwezig) line. Defaults to enabled. |
|outofoffice| false                    | | Set to `false` to hide the Extern (Out-of-office) line. Defaults to enabled. |
