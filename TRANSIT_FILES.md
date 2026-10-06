# Fonctionnalite Transit Seddo

## Definition d'une docs

Une mini-app est une application legere concue pour fonctionner a l'interieur
d'une plateforme hote, comme une application mobile, un environnement TCMPP
ou WeChat. Elle permet d'offrir une fonctionnalite complete sans installer
une application native independante sur le telephone.

Une mini-app possede generalement :

- une interface utilisateur composee de pages, de composants, de formulaires,
  de boutons et de listes ;
- une logique applicative qui gere les actions de l'utilisateur, les etats,
  les validations, le chargement et les erreurs ;
- des services qui communiquent avec des API distantes pour rechercher,
  enregistrer ou afficher des donnees ;
- un stockage local pour conserver certaines informations sur l'appareil,
  comme les favoris ou les preferences ;
- des APIs fournies par la plateforme hote pour utiliser la geolocalisation,
  la navigation, les notifications, les permissions ou d'autres fonctions du
  telephone ;
- une configuration qui declare les pages, les permissions, les ressources et
  les regles d'acces au reseau.

Dans TCMPP, une mini-app est constituee principalement de pages et de
composants utilisant `Page()` et `Component()`. La structure de l'interface
est ecrite en WXML, les styles en WXSS et la logique en JavaScript. Les APIs
de la plateforme sont accessibles avec l'objet `wx`, par exemple
`wx.getLocation`, `wx.request`, `wx.openLocation` et
`wx.getStorageSync`.

Le fonctionnement general est le suivant :

1. L'utilisateur ouvre la mini-app depuis l'application hote.
2. La plateforme charge la page demandee et execute son cycle de vie.
3. La page affiche les donnees initiales et reagit aux actions de
   l'utilisateur.
4. La logique appelle les services distants necessaires et met l'interface a
   jour avec `setData`.
5. La plateforme controle les permissions et execute les fonctions natives
   autorisees.
6. L'utilisateur peut quitter la mini-app sans installer un binaire Android
   ou iOS independant.

Une mini-app n'est donc pas la meme chose qu'une application mobile native :
elle depend de la plateforme hote, de ses APIs et de ses regles de securite.
Elle est plus rapide a distribuer et a mettre a jour, mais certaines
fonctions, performances et permissions sont limitees par l'environnement
TCMPP. Les domaines utilises par les requetes peuvent aussi devoir etre
declares dans une liste blanche.

Dans ce projet, `tcmpp-seddo` est la mini-app TCMPP de Seddo et
`pages/transit/` constitue sa fonctionnalite de transport. Elle permet de
rechercher un trajet entre une origine et une destination, d'interroger
l'API Transit v2, d'afficher les itineraires de bus et d'utiliser la
geolocalisation ainsi que la navigation vers un arret.

Ce document recense les fichiers ajoutes ou modifies pour reproduire le menu
« Ligne de bus » de `seddo-mobile` dans la mini-app TCMPP `tcmpp-seddo`.

## Vocabulaire TCMPP

- `WXML` signifie **WeiXin Markup Language**. C'est le langage de structure
  utilise par les mini-apps TCMPP/WeChat, comparable au HTML. Dans ce projet,
  `pages/transit/index.wxml` definit les champs, boutons, onglets, timeline et
  cartes de bus affiches a l'ecran.
- `WXSS` signifie **WeiXin Style Sheets**. C'est le langage de styles utilise
  par les mini-apps TCMPP, comparable au CSS. Dans ce projet,
  `pages/transit/index.wxss` definit les couleurs, tailles, espacements,
  bordures et styles de la page transit.


## Page de mini-app

### `pages/transit/index.js`

Logique principale de l'ecran transit :

- recherche d'une origine et d'une destination ;
- suggestions d'adresses Dakar avec Nominatim ;
- utilisation de la position actuelle avec `wx.getLocation` ;
- inversion origine/destination ;
- selection de la date et de l'heure ;
- sauvegarde des favoris avec `wx.setStorageSync` ;
- appel de l'API Transit v2 ;
- affichage des itineraires sous forme d'onglets Plus rapide, Alternative et Panoramique ;
- affichage de la timeline de l'itineraire selectionne avec marche, arrets, bus et destination ;
- affichage des badges Direct/Correspondance et de la duree du trajet ;
- affichage des arrets intermediaires de chaque troncon ;
- ouverture de l'arret avec `wx.openLocation` ;
- choix automatique de l'image selon le type de transport : BRT, DDD ou AFTU.

### `pages/transit/index.wxml`

Interface de la page :

- champs Origine et Destination ;
- liste des suggestions ;
- bouton de geolocalisation ;
- image `switch.svg` pour inverser le trajet ;
- selecteurs date et heure ;
- liste des favoris avec leurs icones ;
- onglets de selection des itineraires ;
- timeline de l'itineraire selectionne ;
- image du type de bus pour chaque troncon ;
- informations de ligne, horaires et duree ;
- bouton de navigation vers l'arret de depart ;
- bloc des arrets intermediaires.

### `pages/transit/index.wxss`

Styles de l'ecran transit :

- panneau de recherche ;
- cartes de favoris ;
- onglets et timeline des itineraires ;
- dimensions stables des images de bus et des icones ;
- couleurs et espacements de l'interface Seddo.

### `pages/transit/index.json`

Configuration de la page et titre de navigation : `Lignes de bus`.

## Service API

### `utils/apis/transit.js`

Service technique du transit :

- recherche d'adresses via Nominatim ;
- geocodage inverse pour la position actuelle ;
- appel de l'endpoint Transit v2 ;
- transformation des lieux en objets utilisables par la page ;
- retour des itineraires bruts pour conserver les informations de l'API.

Endpoint utilise :

```text
POST https://transit.innovimpactdev.cloud/api/v2/transit/find-bus
```

Payload envoye :

```json
{
  "date": "20260801",
  "time": "18:32:00",
  "departureLat": 14.6937949,
  "departureLon": -17.4914255,
  "destinationLat": 14.7115399,
  "destinationLon": -17.47601,
  "maxDistanceFrom": 2000,
  "maxDistanceTo": 2000,
  "orderByFrom": true
}
```

Les coordonnees et la date sont dynamiques dans l'application.

### `utils/config.js`

Contient la configuration des bases API. La propriete `TRANSIT_BASE_URL`
contient la base de l'API Transit v2 :

```text
https://transit.innovimpactdev.cloud/api/v2
```

## Assets reutilises depuis Flutter

Les fichiers suivants ont ete copies depuis
`seddo-mobile/assets/transit/` vers `tcmpp-seddo/assets/transit/`.

### Types de bus

- `assets/transit/aftu.png` : image utilisee pour les lignes AFTU et les types inconnus.
- `assets/transit/brt.png` : image utilisee pour les lignes BRT.
- `assets/transit/dddk.png` : image utilisee pour les lignes DDD.
- `assets/transit/arretbus.png` : icone des arrets de bus dans les suggestions et la timeline.

### Actions et favoris

- `assets/transit/switch.svg` : inversion origine/destination.
- `assets/transit/icons/home.svg` : favori Domicile.
- `assets/transit/icons/office.svg` : favori Bureau.
- `assets/transit/icons/school.svg` : favori Ecole.
- `assets/transit/icons/add.svg` : bouton d'ajout d'une adresse favorite.
- `assets/transit/icons/edit.svg` : bouton de modification d'une adresse favorite deja enregistree.

## Configuration de routage

### `app.json`

La page `pages/transit/index` est declaree dans la liste des pages et la
permission `scope.userLocation` est ajoutee pour permettre la recherche depuis
la position actuelle.

### `pages/index/index.js`

Ajoute la methode `handleNavigateTransit`, qui ouvre la page transit depuis
l'accueil avec `wx.navigateTo`.

### `pages/index/index.wxml`

Ajoute le bouton `Ligne de bus` dans l'accueil.

## Correspondance avec Flutter

| Flutter | TCMPP |
|---|---|
| `TransportCommun.dart` | `pages/transit/index.*` |
| `DakarSearchWidget.dart` | Recherche Nominatim dans `utils/apis/transit.js` |
| `FavoritePlacesWidget.dart` | Favoris dans `pages/transit/index.js` et `wx` storage |
| `RouteTimelinePage.dart` | Onglets et timeline de l'itineraire dans `pages/transit/index.wxml` |
| `RouteTimelineBloc.dart` | `findBusRoutes()` dans `utils/apis/transit.js` |
| `assets/transit/*.png` | `assets/transit/*.png` |
| `assets/transit/icons/*.svg` | `assets/transit/icons/*.svg` |

## Test rapide

1. Ouvrir `tcmpp-seddo` dans TCMPP Developer Tools.
2. Ouvrir la page `Ligne de bus` depuis l'accueil.
3. Choisir une origine et une destination dans les suggestions.
4. Cliquer sur `Rechercher`.
5. Vérifier les onglets `Plus rapide`, `Alternative` et `Panoramique`.
6. Sélectionner un onglet et vérifier la timeline, les badges, les horaires et les arrets intermédiaires.
7. Vérifier l'image AFTU, BRT ou DDD sur chaque troncon.
8. Cliquer sur `Naviguer vers cet arret` pour tester `wx.openLocation`.

La compilation et l'affichage doivent etre verifies dans TCMPP Developer Tools,
car les APIs `wx.*` ne sont pas disponibles dans Node.js ou dans un navigateur
classique.
