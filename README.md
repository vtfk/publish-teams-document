# publish-teams-document
Publish sharepoint documents to innsida and the public web

# TODO
slettejobb i destinasjons-biblioteket

## ISSUES
- Set-up-source-libraries tryner stort sett på første kjøring, må kjøres flere ganger... Fiks det når du har masse tid.
- Håndtering av biblioteker som har egendefinerte kolonner før oppsett av løsningen - ser ut til at disse blir med i Dokumentpubliserings-visningen

## Remarks
- Hvis noen plutselig skrur på versonering vil ikke integrasjonen ta hensyn til dette før etter 24 timer (grunnet caching av spørring om det er på versjonering på et bibliotek) - så gi gjeeerne beskjed før man gjør det...
- Når du sletter kolonner blir ikke data på elementer for den kolonnen slettet - bare skjult. Det betyr at hvis man skal ha en EKTE reset av et bibliotek, må man iterere over items og fjerne data for kolonnene man skal fjerne, før man fjerner kolonnen.

## Førstegangs-oppsett
- Sett opp env med sertifikater og stæsj [se .env eksempel lenger ned](#lag-deg-en-env)
- Kjør oppsett av destinasjonsbiblioteket `node ./scripts/setup-destination-library.js` - om noe feiler, bare kjør det på nytt, da fikser den kun det som evt feila - kan også kjøres senere om det er gjort endringer i kolonner eller lignende
- Sett opp publiseringsbibliotketer i ./config/source-libraries.js (ta en kopi av source-libraries-example.js og rename - så bør du skjønne oppsettet)
- Kjør oppsett av kildebiblioteker som trenger oppsett (om de har skipSetup=false) - `node ./scripts/setup-libraries.js` om noe feiler, bare kjør det på nytt, da fikser den kun det som evt feila - kan også kjøres senere om det er gjort endringer i kolonner eller lignende
- For å kjøre selve publiseringsjobben `node ./scripts/queue-and-publish-ready-documents.js` - sett gjerne jobben til å gå hvert 5. minutt i task-scheduler eller lignende for å blidgjøre brukerne

## Sette opp biblioteker
- Hvis du skal være forsiktig - disable scheduled task først (går nok bra å la den gå og)
- Sett opp nytt publiseringsbibliotket i ./config/source-libraries.js
- Kjør oppsett av kildebiblioteker som trenger oppsett (om de har skipSetup=false) - `node ./scripts/setup-libraries.js` om noe feiler, bare kjør det på nytt, da fikser den kun det som evt feila - kan også kjøres senere om det er gjort endringer i kolonner eller lignende
- Sett på scheduled task igjen, så er det good

## Logs
Finner du i ./logs mappen her - sortert på mnd/år per script

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

```bash
SOURCE_AUTH_TENANT_ID="tenant id for der dokumentene skal publiseres fra"
SOURCE_AUTH_TENANT_NAME="tenant navn for der dokumentene skal publiseres fra"
SOURCE_AUTH_CLIENT_ID="client id for der dokumentene skal publiseres fra"
SOURCE_AUTH_PFX_PATH="path til sertifikatet som brukes for autentisering for source_client"
SOURCE_AUTH_PFX_THUMBPRINT="thumbprint på sertifikatet som brukes for autentisering for source_client"
DESTINATION_AUTH_TENANT_ID="tenant id for der dokumentene skal publiseres til - vanligvis samme som source"
DESTINATION_AUTH_TENANT_NAME="tenant navn for der dokumentene skal publiseres til - vanligvis samme som source"
DESTINATION_AUTH_CLIENT_ID="client id for der dokumentene skal publiseres til - vanligvis samme som source"
DESTINATION_AUTH_PFX_PATH="path til sertifikatet som brukes for autentisering for destination_client - vanligvis samme som source"
DESTINATION_AUTH_PFX_THUMBPRINT="thumbprint på sertifikatet som brukes for autentisering for destination_client - vanligvis samme som source"
DESTINATION_LIBRARY_URL="https://{tenant}.sharepoint.com/sites/{sitename}/{libraryName} - bibliotek der publiserte dokumenter skal havne"
DESTINATION_SITE_ID="site id for biblioteket publiserte dokumenter ligger i"
DESTINATION_LIST_ID="list id for bibloteket publisere dokumenter ligger i"
GRAPH_URL="https://graph.microsoft.com"
WEB_PUBLISH_DESTINATION_PATH="//nettverks-delt-mappe (eller mappe på server) der dokumenter som skal publiseres på nettsider havner"
DISABLE_DELTA_QUERY="true / false - om man vil hente alle dokumenter i et kildebibliotek, eller bare de med endringer siden sist" 
RETRY_INTERVALS_MINUTES="5, 30, 60 - når skal et feilet dokument prøve på nytt"
WEB_PUBLISH_BASE_URL="https://www2.suppe.no/docs base-ur for publiserte dokumenter på nettside"
MAIL_URL="url til mail api"
MAIL_KEY="nøkkel til mail api"
MAIL_TEMPLATE="hvilken mail template bruker du da?"
MAIL_SENDER="avsender av eposten - typisk noreply"
STATISTICS_URL="url til stats api"
STATISTICS_KEY="nøkkel til stats api"
DELETE_FINISHED_AFTER_DAYS="30 hvor lenge skal dokumenter ligge mellomlagret på server før de slettes"
```

## MERK
Når du sletter kolonner blir ikke data på elementer for den kolonnen slettet - bare skjult. Det betyr at hvis man skal ha en EKTE reset av et bibliotek, må man iterere over items og fjerne data for kolonnene man skal fjerne, før man fjerner kolonnen.