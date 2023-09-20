# publish-teams-document
Publish sharepoint documents to innsida and the public web

## Jobbene
Består av to jobber, Dispatcher og Handler. 

### Dispatcher
Henter og sorterer alle dokumenter som skal gjøres noe med og lagrer de til fil dersom de skal gjøres noe med.
Disse filene blir lagret på server i en kø der systemet kjører.

### Handler
Håndterer en og en fil fra køen dispatcher jobben oppretter. 


Husk å sette publisert_versjon til +1 ekstra der versjonering ikke er på (slik at det gir mening mellom currentversjon og publisertversjon)

Sjekk om kolonne er der - om ikke legg de til

Går gjennom alle filer i biblioteket - setter standardverdier


## Lag deg en .env
Graph client må ha sites.FullControl eller readwrite eller no sånt heftig

GRAPH_CLIENT_ID="client iden din"
GRAPH_CLIENT_SECRET="client secreten din"
GRAPH_TENANT_ID="guid til tenanten din"
GRAPH_SCOPE="https://graph.microsoft.com/.default forsempel"
GRAPH_URL="https://graph.microsoft.com for eksempel"