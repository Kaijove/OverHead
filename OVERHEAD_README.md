# ✈️ OVERHEAD

Una aplicació tranquil·la per mirar el cel, escoltar música, estudiar, relaxar-se i simplement disfrutar.

[Índex](#-qué-és-overhead) · [Funcionalitats](#-funcionalitats) · [Executar localment](#-executar-localment) · [Com funciona](#-com-funciona)

![Live Aircraft](https://img.shields.io/badge/✈️_LIVE_AIRCRAFT-0EA5E9?style=flat-square&labelColor=0F172A)
![Interactive Map](https://img.shields.io/badge/🗺️_INTERACTIVE_MAP-6366F1?style=flat-square&labelColor=0F172A)
![Day & Night](https://img.shields.io/badge/🌙_DAY_&_NIGHT-8B5CF6?style=flat-square&labelColor=0F172A)
![Compass](https://img.shields.io/badge/🧭_COMPASS-14B8A6?style=flat-square&labelColor=0F172A)
![Ambient Audio](https://img.shields.io/badge/🎧_AMBIENT_AUDIO-A855F7?style=flat-square&labelColor=0F172A)
![Hidden Places](https://img.shields.io/badge/✨_HIDDEN_PLACES-F59E0B?style=flat-square&labelColor=0F172A)
![Explore Anywhere](https://img.shields.io/badge/🌍_EXPLORE_ANYWHERE-22C55E?style=flat-square&labelColor=0F172A)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&labelColor=0F172A&logo=typescript&logoColor=white)

## 🌌 Qué és OVERHEAD?

Probablement hi ha un avió volant sobre tu ara mateix.

**OVERHEAD et deixa veure'l. ✈️**

Obri l'app, tria una ubicació, i descobreix els avions que volen sobre i al voltant teu en temps real. Veu on són, cap a on van, a quina altura volen, i mira'ls moure's pel cel.

Però OVERHEAD és més que només un mapa en viu d'avions.

**Funcionalitats principals:**

- 🌤️ **Canvia entre dia i nit** — Explora el cel en un mapa diürn net, o activa **Night Flight** per una vista més obscura i atmosfèrica amb llums de ciutat, carreteres i pistes brillant sota teu.
- 🧭 **Gira el món al voltant teu** — Mou, amplia i gira el mapa, segueix la brúixola, i explora el cel des de la direcció que vulguis.
- 🎧 **Escolta mentre mires** — OVERHEAD inclou música ambient dissenyada per a diferents estats d'ànim: des de sons calms per estudiar o treballar fins a pistes atmosfèriques per observar el cel de nit.
- ✨ **Descobreix llocs amagats** — Alguns llocs al món amaguen experiències ambient especials. Explora el mapa, troba'ls i desbloqueja nous sons mentre viatges.
- 🌍 **Busca a qualsevol lloc** — No has de ser on ets. Busca una ciutat o lloc i veu com es veu el cel allà.

Pots deixar OVERHEAD oberta mentre estudies, treballes, relaxes, escoltes música, o simplement et demanes quin és l'avió que vola sobre teu.

I quan un avió s'acosti a la teva posició...

**Mira amunt. ✈️**

---

## ✨ Funcionalitats

| Feature | Descripció |
|---------|-----------|
| ✈️ **Avions en viu** | Veu avions propers i mira'ls moure's pel mapa |
| 📍 **La teva ubicació** | Comença des de la teva ubicació real o tria un lloc manualment |
| 🧭 **Brúixola real** | Utilitza l'orientació del teu dispositiu per trobar nord |
| 🗺️ **Mapa rotable** | Desplaça, amplia i gira el món naturalment |
| 🌍 **Vista de globus** | Amplia i explora el planeta |
| 🌙 **Night Flight** | Un món fosc amb ciutats, carreteres i llums |
| 🎧 **Àudio ambient** | Sons calms per estudiar, relaxar-se o simplement disfrutar |
| 🌍 **Llocs amagats** | Descobreix pistes ambient amagades al voltant del món |
| 💾 **Memòria local** | Recorda ubicacions seleccionades i descobriments al teu dispositiu |
| ⚡ **Lleuger** | Sense comptes, analítiques, base de dades ni backend innecessari |

---

## 🛰️ Cel en viu

Les dades dels avions provenen de la **OpenSky Network**.

OVERHEAD demana una petita àrea al voltant de la teva ubicació i mostra els avions actualment visibles allà.

L'arquitectura és simple:

```
🛰️ OpenSky
    ↓
📡 Dades d'avions
    ↓
✈️ OVERHEAD
    ↓
🌌 El teu cel
```

Les posicions dels avions s'actualitzen aproximadament cada **15 segons**.

En lloc de saltar entre posicions, els avions s'interpolen suavament entre actualitzacions per que sembli que en realitat estàn volant pel mapa.

---

## 🗺️ Explora el món

El mapa no és només quelcom que està sota els avions. Pots interactuar amb ell de diverses maneres:

| Acció | Control |
|-------|---------|
| 🖐️ Desplaça | Arrossega |
| 🔍 Amplia | Desplaçament / Pellisca |
| 🔄 Gira | Dos dits / Clic dret + arrossega |
| 🧭 Nord | Brúixola |

El mapa es pot girar lliurement. Quan has girat lluny de nord, apareix una petita **N** al costat de la brúixola perquè sempre sàpigues la teva orientació.

Si el teu dispositiu proporciona un encapçalament real, fer clic a la brúixola pot entregar el control del mapa al teu dispositiu.

### Tres direccions diferents

OVERHEAD manté aquestes separades intencionadament:

- 🗺️ **Orientació del mapa** — cap a on està girat el mapa
- ✈️ **Rumb de l'avió** — cap a on vola un avió
- 🧭 **Encapçalament del dispositiu** — cap a on mires físicament

Girar el mapa mai canvia la direcció cap a on apunta un avió.

---

## 🌙 Night Flight

El món canvia quan amplifiques.

OVERHEAD utilitza la imatge **VIIRS Black Marble** de la NASA per a la vista nocturna global, combinada amb capes de vector personalitzades que mantenen les ciutats, carreteres i pistes nítides mentre amplifiques.

A distància:

> 🌍 El planeta brilla.

Més a prop:

> 🏙️ Les ciutats comencen a aparèixer.

Encara més a prop:

> 🛣️ Carreteres i pistes emergeixen.

La transició està dissenyada per sentir-se contínua en lloc de com canviar entre dos mapes completament diferents.

---

## 🎧 Mode ambient

OVERHEAD no està dissenyada per exigir la teva atenció.

És quelcom que pots deixar oberta en el background mentre:

- 📚 estudies
- 💻 treballes
- 🌙 relaxes
- 🎵 escoltes música
- 🧘 descansses
- 🌌 mires el cel

Dues pistes ambient sempre estan disponibles.

Altres pistes estan amagades al voltant del món i es poden descobrir explorant diferents ubicacions.

L'ambient sempre disponible es genera directament al navegador utilitzant la **Web Audio API**.

Les pistes amagades viuen localment a `public/audio/`.

> 🎧 El cel no necessita una llista de reproducció.

---

## 🌍 Els llocs amagats

Hi ha llocs amagats al voltant del món.

Alguns estan prop de punts de referència famosos:

- 🗼 Torre Eiffel
- 🗻 Mont Fuji
- 🏔️ Machu Picchu
- 🌍 i altres

Res es presenta com a llista de verificació.

Res et diu on està tot.

Acosta't el suficient i un lloc amagat es revela.

Un cop descobert, es manté recordat localment al teu dispositiu.

Un brillo feble pot aparèixer quan un lloc no descobert es fa visible al mapa — just el suficient per fer-te curiositat.

---

## 🔐 Privacitat

OVERHEAD és intencionadament simple.

- 📍 La teva ubicació s'utilitza per trobar avions propers.
- 💾 Els llocs seleccionats manualment es guarden localment.
- 🚫 Sense comptes.
- 🚫 Sense seguiment.
- 🚫 Sense analítiques.
- 🚫 Sense base de dades.
- 🚫 Sense perfils d'usuari.

La teva ubicació triada i descobriments es queden al `localStorage` del navegador.

---

## 🔒 Permisos

Res es demana innecessàriament.

| Permís | Comportament |
|--------|-------------|
| 📍 **Ubicació** | Demanat en obrir l'app |
| 🧭 **Brúixola** | Demanat només quan sigui necessari |
| 🎧 **Àudio** | Comença només després d'interacció de l'usuari |

Si denies un d'ells, la resta de l'aplicació continua funcionant.

Sense ubicació? → Busca un lloc manualment.

Sense brúixola? → Manté't orientat al nord.

Sense àudio? → Continua explorant en silenci.

---

## ⚡ Lleuger per disseny

OVERHEAD no necessita una stack enorme.

### Tecnologies utilitzades

| Tecnologia | Propòsit |
|-----------|----------|
| ⚛️ **React 19** | UI |
| 🔷 **TypeScript** | Lògica d'aplicació |
| ⚡ **Vite** | Desenvolupament i construcció |
| 🗺️ **MapLibre GL** | Mapa interactiu |
| 🛰️ **OpenSky Network** | Dades d'avions |
| 🎧 **Web Audio API** | Ambient generat |
| 🌍 **Nominatim** | Cerca de llocs |

Sense biblioteca de gestió d'estat.

Sense base de dades.

Sense comptes.

Sense analítiques.

Sense backend tradicional.

El motor del mapa es carrega només quan es necessita, mantenint l'aplicació inicial lleugera.

---

## 🚀 Executar localment

```bash
git clone <your-repository-url>
cd overhead

npm install
npm run dev
```

Construir per a producció:

```bash
npm run build
```

Previsualitzar la construcció de producció:

```bash
npm run preview
```

---

## 🔑 OpenSky API

OVERHEAD funciona anònimament amb OpenSky.

Per a límits d'API més alts, crea un client de l'API OpenSky i afegeix les teves credencials a `.env`:

```env
OPENSKY_CLIENT_ID=your_client_id
OPENSKY_CLIENT_SECRET=your_client_secret
```

Mira `.env.example` per a la configuració esperada.

L'aplicació gestiona la limitació de velocitat amb gràcia. Si OpenSky respon amb `429`, OVERHEAD espera la quantitat de temps sol·licitada mentre manté els avions ja visibles a la pantalla.

### OpenSky límits i arquitectura

L'accés anònim a OpenSky proporciona una assignació de crèdit diari limitada.

L'accés autenticat proporciona una assignació més alta.

El client sondeja aproximadament cada 15 segons i deixa de sondejar mentre la pestanya del navegador està amagada.

La funció `api/states.ts` del costat del servidor existeix principalment perquè la política CORS del navegador d'OpenSky no permet orígens arbitraris.

Reenvía el quadre delimitador sol·licitat i retorna les dades de l'estat de l'avió.

Res es guarda.

El mateix mòdul s'utilitza com a funció serverless en producció i com a middleware de desenvolupament localment.

---

## 🧭 Com funciona

En el seu nucli, OVERHEAD és deliberadament petit:

```
📍 Ubicació
    ↓
🗺️ Quadre delimitador
    ↓
🛰️ OpenSky
    ↓
✈️ Estats dels avions
    ↓
🌌 Mapa
    ↓
👀 Mira amunt
```

L'estat de l'avió conté informació com:

- ICAO24
- senyalització
- posició
- altitud
- velocitat
- encapçalament
- país d'origen

OVERHEAD neteja i normalitza les dades abans de mostrar-les.

Les posicions dels avions s'interpolen localment entre actualitzacions de l'API per mantenir el moviment suau.

---

## 🗺️ Arquitectura del mapa

El mapa té dos modes visuals:

### 🛰️ Satèl·lit

Imatge mundial d'Esri, desaturada i enfosquida pesadament per que la imatge es quedi darrera dels avions en lloc de competir amb ells.

### 🌙 Nit

NASA VIIRS Black Marble combinada amb dades de vector d'OpenFreeMap i un estil de mapa personalitzat.

Ambdós modes comparteixen la mateixa instància del mapa.

Canviar entre ells canvia la visibilitat de la capa en lloc de destruir i reconstruir el sistema de l'avió/mapa.

---

## 🎧 Arquitectura ambient

Les dues pistes ambient permanent no requereixen arxius d'àudio.

Es generen utilitzant una petita recepta de Web Audio:

```
🎵 Nota arrel
   +
🎵 Intervals
   +
🎚️ Filtre
   +
🌊 Deriva lenta
   ↓
🎧 So ambient
```

Les pistes amagades es guarden a:

```
public/audio/
```

Les definicions de pistes viuen a:

```
src/services/ambient/tracks.ts
```

Afegir una altra pista és intencionadament senzill.

> Només utilitzi àudio que posseïu o àudio que té una llicència adequada per al projecte.

---

## 🛰️ API i emmagatzematge en caché

La funció del servidor:

```
api/states.ts
```

existeix per proxar les sol·licituds d'OpenSky.

També:

- Subjecta els quadres delimitadors
- Emmagatzema en caché sol·licituds propers
- Redueix sol·licituds duplicades
- Respecta els límits de velocitat d'OpenSky

Els quadres delimitadors es caragolen a una graella gruixuda perquè els usuaris propers puguin compartir resultats en caché en lloc de colpejar repetidament l'API.

---

## ⚠️ Limitacions conegudes

- 🛰️ La cobertura d'avions depèn de la xarxa de receptors d'OpenSky.
- 🌊 La cobertura pot ser escassa sobre oceans i algunes regions.
- ⏱️ Les posicions s'actualitzen aproximadament cada 15 segons.
- 🧭 Els dispositius d'escriptori generalment no proporcionen un magnetòmetre real.
- 📱 El comportament de la brúixola depèn del dispositiu i del navegador.
- ✈️ Els marcadors de l'avió són intencionadament interactius del mapa en lloc de focusables per teclat.

---

## 🙌 Crèdits

OVERHEAD utilitza diversos serveis i conjunts de dades oberts:

- 🛰️ [OpenSky Network](https://openskynetwork.github.io/opensky-api/rest.html) — dades d'avions
- 🌍 OpenStreetMap / OpenFreeMap — dades del mapa
- 🌙 NASA VIIRS Black Marble — imatge nocturna
- 🛰️ Esri World Imagery — imatge de satèl·lit
- 🔎 Nominatim — cerca de llocs
- 🗺️ MapLibre GL — renderització de mapa

---

### 🌌 Fet per a nits tranquil·les, ments curioses i mirar amunt.

**✈️ OVERHEAD**

Si t'agrada el projecte, considera donar-li una ⭐
