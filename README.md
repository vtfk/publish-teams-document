# publish-teams-document
Publish sharepoint documents to innsida and the public web

## Jobbene
Består av to jobber, Dispatcher og Handler. 

### Dispatcher
Henter og sorterer alle dokumenter som skal gjøres noe med og lagrer de til fil dersom de skal gjøres noe med.
Disse filene blir lagret på server i en kø der systemet kjører.

### Handler
Håndterer en og en fil fra køen dispatcher jobben oppretter. 