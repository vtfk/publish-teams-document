# publish-teams-document
Publish sharepoint documents to innsida and the public web

## Remarks
Hvis noen plutselig skrur på versonering vil ikke integrasjonen ta hensyn til dette før etter 24 timer (grunnet caching av spørring om det er på versjonering på et bibliotek) - så gi gjeeerne beskjed før man gjør det...

## Scripts
Består av to jobber, QueueReadyDocuments og publish ready documents. 

### QueueReadyDocuments
Henter og sorterer alle dokumenter som skal gjøres noe med og lagrer de til fil dersom de skal gjøres noe med.
Disse filene blir lagret på server i en kø der systemet kjører.

### Handler
Håndterer en og en fil fra køen dispatcher jobben oppretter. 


Husk å sette publisert_versjon til +1 ekstra der versjonering ikke er på (slik at det gir mening mellom currentversjon og publisertversjon)

Sjekk om kolonne er der - om ikke legg de tilW

Går gjennom alle filer i biblioteket - setter standardverdier

## Jobs
Enkeltjobber som kan kjøres basert på kriterier, kan kjøres på nytt dersom de ikke fungerte ved forrige kjøring

### Publish to Innsida
Oppretter eller oppdaterer en fil i Innsida dokument-biblioteket
Setter også metadata på filen

### Publish to Web
Oppretter eller oppdaterer en fil på EPI-server (filområde)

### Set status on source element
Oppdaterer feltene på originaldokumentet, urler, publisert versjon osv..

## Alert publisher


## Statistics



## Lag deg en .env
App registration må ha sites.FullControl / readwrite og sharepoint readwrite all sites application permissions
Graph client må ha sites.FullControl eller readwrite eller no sånt heftig

GRAPH_CLIENT_ID="client iden din"
GRAPH_CLIENT_SECRET="client secreten din"
GRAPH_TENANT_ID="guid til tenanten din"
GRAPH_SCOPE="https://graph.microsoft.com/.default forsempel"
GRAPH_URL="https://graph.microsoft.com for eksempel"


## Ting vi må tenke på
Når skal dette i drift - hva gjør vi med migrering??

Innholdsprodusentene har tilgang på de midlertidige temane (f.eks V-ORG) i dagens vtfk-tenant. Her kan de legge inn dokumneter og velge publiser på Innsida/vestfoldfylke.no/telemarkfylke.no - de har også tilgang til der de publiserte dokumentene skal havne i de nye intranettene - altså:
vestfoldfylke.no/sites/varorganisasjon/blbalab


## Skriv tilbake til en kolonne med url til det publiserte dokumentet.


HVOR skal publiserte dokumenter havne??

Når skjer V-ORG fra vtfk til vfk migrering - når stopper denne migreringen?

Vi setter opp på alle tre taskserverne med connections (sertifikater) og id-er og hele paketet - og switcher på d-day.

Migreringsmoro begynner 1 november men fortsetter utover vinterens kalde dager. (varme dager for Nils)

Jørgen periser i gang

## MERK
Når du sletter kolonner blir ikke data på elementer for den kolonnen slettet - bare skjult. Det betyr at hvis man skal ha en EKTE reset av et bibliotek, må man iterere over items og fjerne data for kolonnene man skal fjerne, før man fjerner kolonnen.