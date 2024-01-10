# publish-teams-document
Publish sharepoint documents to innsida and the public web

# TODO
bedre doks

## Remarks
Hvis noen plutselig skrur på versonering vil ikke integrasjonen ta hensyn til dette før etter 24 timer (grunnet caching av spørring om det er på versjonering på et bibliotek) - så gi gjeeerne beskjed før man gjør det...

## Flyt
## Queue-ready-documents
- For hver site satt opp og enabled i source-libraries.js
  - Hent alle dokumenter fra bibiloteket som det har skjedd endringer med siden sist vi spurte, via [delta spørring](https://learn.microsoft.com/en-us/graph/delta-query-overview)
  - For hvert dokument som oppfyller kriterie for publisering (har valgt en publiseringsmetode på elementet, og nåverende major version er større enn publiserte major version)
    - Dersom dokumentet ikke er der allerede eller har fått ny hovedversjon, skriv dokumentet til køen (documents/queue). Filnavnet genereres ut i fra site-id, list-id, og item-id (f. eks webUrl endres hvis du flytter dokumentet internt i biblioteket, så denne kan ikke brukes. item-id endres ikke ved flytting - noe som betyr at brukeren kan trygt flytte filen internt i biblioteket uten at koblingen til det publiserte dokumentet blir ødelagt), slik at hvis vi får det samme dokumentet igjen (men en nyere hovedversjon, blir den forrige versjonen overskrevet). Dersom dokumentet finnes allerede, og ikke har ny hovedversjon, så fortsetter vi bare med den fila vi har, og skriver ikke over (da beholder vi evt fullførte jobber på dokumentet også)
> [!NOTE]
> Når vi bruker delta-spørring vil vi potensielt få filer som vi har allerede, dersom det har skjedd endringer på filen siden forrige spørring, og publiseringen ikke gikk gjennom på første forsøk for forrige versjon. Dersom dokumentet er publisert på nytt (har ny hovedversjon), vil den forrige feilede publiseringen bli overskrevet, og vi prøver alle jobbene på nytt. Dokumentet skal uansett publiseres på nytt.

## Handle-document
For hvert dokument / fil som ligger i køen, om det er klart for å kjøres (ikke venter på retry)

### Get-drive-item-data
- Hent driveItem for det gjeldende dokumentet (vi får ikke expandet driveItem når vi bruker deltaSpørring, så vi henter den her)
- Hent versjoner for det gjeldende dokumentet - finn lastModifier på hovedversjonen vi skal publisere. Dette er personen vi skal varsle om at dokumentet er publisert. (lastModifier på f. eks 5.2 er ikke nødvendigvis lastModifier på versjon 5.0)
- Sjekk om vi publiserer siste versjon (om vi publiserer siste versjon, kan vi ikke be om fildata fra versions endepunktet, men må gå rett på driveItem, derav denne sjekken)
- Hent fildata, cache fildata for videre bruk. Da har vi akkurat den filen som skal publiseres.
> [!NOTE]
> Dersom denne jobben feiler, vil vi spørre på nytt ved neste kjøring, og da fange opp potensielle nye endringer, og vi skal kanskje ikke publisere den nyeste versjonen lenger - derfor en litt vel komplisert jobb for lite.

### Publish-to-Innsida
- Dersom kritere for Innsida publisering er oppfylt for biblioteket
- Last opp fildata til korrekt element i Innsida dokumentbibliotek (opprett eller oppdater, basert på siteId, listId, itemId)
- Sett metadata på filen i det nye biblioteket (metadata om kilden osv)
- Lagre resultat (webUrl, metadata)

### Publish-to-web
- Dersom kritere for web publisering er oppfylt for biblioteket
- Last opp fildata til korrekt element på filshare (opprett eller oppdater, basert på siteId, listId, itemId)
- Lagre resultat (webUrl, metadata)

### Set-status-on-source
- Sett metadata på kildeelementet (publisert versjon, weburler)

### Alert-publisher
- Send e-post / varsel til publisher funnet i get-drive-item-data, om at dokumentet er publisert, med webUrls

### Statistics
- Opprett element i statistikk-databasen

## Lag deg en .env
App registration må ha sites.FullControl / readwrite og sharepoint readwrite all sites application permissions
Graph client må ha sites.FullControl eller readwrite eller no sånt heftig

GRAPH_CLIENT_ID="client iden din"
GRAPH_CLIENT_SECRET="client secreten din"
GRAPH_TENANT_ID="guid til tenanten din"
GRAPH_SCOPE="https://graph.microsoft.com/.default forsempel"
GRAPH_URL="https://graph.microsoft.com for eksempel"



## MERK
Når du sletter kolonner blir ikke data på elementer for den kolonnen slettet - bare skjult. Det betyr at hvis man skal ha en EKTE reset av et bibliotek, må man iterere over items og fjerne data for kolonnene man skal fjerne, før man fjerner kolonnen.