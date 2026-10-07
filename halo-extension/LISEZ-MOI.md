# Halo pour Zen — version 0.2.21

Une extension autonome pour prolonger les **bords des vidéos YouTube et Twitch** autour du lecteur, avec flou et disparition progressive dans la transparence de Zen. Les couleurs gardent leur position le long de chaque bord quand l’étendue change. Le halo suit la vidéo, avec une cadence maximale et un lissage réglables.

La version 0.2 ajoute le mode **Prolonger les bords**, activé par défaut, la détection conservatrice des bandes noires symétriques et le suivi immédiat des changements nets de plan. L’ancien mode **Agrandir l’image** reste disponible dans le sélecteur Projection. Les préférences déjà enregistrées restent conservées, notamment l’assombrissement.

La correction 0.2.1 conserve le halo à sa place autour du lecteur dans la page pendant le défilement. Il reste visible tant qu’une partie de son étendue est à l’écran, puis sort naturellement du champ avec la page. L’étendue peut de nouveau atteindre **6 000 px**. Les autres réglages et le rendu de la version 0.2 sont conservés.

La version 0.2.2 ancre la surface lumineuse directement dans le document : elle défile avec la page, y compris avant l’exécution des événements de scroll. Le rendu utilise une échelle et une grille d’échantillonnage stables. Une marge de dessin évite de redimensionner la surface à chaque mouvement. L’assombrissement local suit aussi le document ; le voile uniforme conserve son comportement habituel.

La version 0.2.3 corrige la coupure sous le header : la surface couvre aussi l’espace réservé à la barre YouTube lorsque cette marge décale le corps de page. L’ancrage dans le document et l’étendue jusqu’à 6 000 px restent inchangés.

La version 0.2.4 ajoute **Flou par direction**, dans **Affiner le rendu** : haut, droite, bas et gauche se règlent séparément, avec un raccord progressif dans les coins. Les quatre valeurs commencent à 100 % pour conserver le rendu existant.

La version 0.2.5 ajoute **Lecteur → Arrondi du lecteur**, de 0 à 64 px, avec 24 px par défaut. L’arrondi s’applique en mode normal et cinéma. Il se retire automatiquement en plein écran et retrouve la valeur choisie à la sortie. À 0 px, Halo laisse les coins carrés. Les préréglages de lumière préservent ce réglage.

La version 0.2.6 adapte cet arrondi aux dimensions de l’image affichée : vidéos 4:3, verticales ou larges, même lorsque le lecteur est plus grand que l’image. Le masque suit le format et le placement de la vidéo lors d’un redimensionnement, sans déplacer les commandes. Les bandes noires encodées dans les images ne changent pas le format de la vidéo : la détection des bandes et le recadrage manuel continuent à concerner uniquement le halo.

La version 0.2.7 aligne automatiquement la **timeline sur l’image en mode cinéma**, avec une petite marge intérieure. Les commandes se rapprochent aussi de l’image et suivent son bord inférieur. Sur une vidéo très étroite, les boutons disposent d’un espace plus large pour rester utilisables ; la timeline reste limitée à l’image. Les chapitres conservent leurs proportions. Le mode normal, le plein écran et la désactivation de Halo restaurent la disposition native de YouTube.

La version 0.2.8 ajoute **les directs et les rediffusions Twitch** sur `www.twitch.tv`. Le halo, les flous par direction, les noirs transparents, l’assombrissement et l’arrondi utilisent les mêmes préférences que YouTube. Le halo accompagne le défilement interne de Twitch dans la zone principale. Les aperçus de l’accueil, les listes, le mini-lecteur, les clips et les lecteurs intégrés restent exclus. Les commandes et la timeline Twitch conservent leur fonctionnement natif.

La version 0.2.9 corrige le **curseur décalé de la timeline YouTube en mode cinéma** : il suit l’extrémité réellement affichée de la barre rouge, même lorsque YouTube conserve une ancienne largeur en mémoire. Sur Twitch, le halo s’étend aussi derrière **le header et la colonne de gauche du site**, avec les mêmes couleurs, flous et réglages d’assombrissement. La timeline Twitch conserve ses dimensions natives. Aucun changement du thème du navigateur n’est nécessaire.

La version **0.2.10** corrige le décalage entre la souris, la prévisualisation et la recherche temporelle sur YouTube. En mode cinéma, le cadre du lecteur est ajusté au format de la vidéo : YouTube recalcule lui-même sa barre, ses chapitres, son curseur et son aperçu dans ces dimensions. Les corrections visuelles séparées de la timeline sont retirées. La place réservée au lecteur dans la page est conservée. En mode normal, en plein écran ou à la désactivation, les dimensions d’origine sont restaurées. Les commandes Twitch restent natives.

La version **0.2.11** prolonge le halo sur **toute la largeur du header Twitch**, y compris au-dessus du chat. Le chat reste exclu du halo sous le header. Le fond noir des conteneurs de réservation sous le lecteur devient transparent : il ne ressort plus dans les coins arrondis.

Dans **Chat Twitch**, l’option **Chat translucide et aéré** ajoute un panneau arrondi, un fond flouté, des séparations discrètes, des messages espacés et un champ de saisie arrondi. L’**opacité du fond du chat** se règle de 0 à 100 %, avec 45 % par défaut. Les couleurs du thème clair ou sombre de Twitch sont utilisées. Désactiver cette option restaure le chat habituel. Les préréglages de lumière préservent ce choix et son opacité. Le style du chat reste actif quand le halo quitte l’écran au scroll, puis est retiré en quittant la chaîne, en plein écran ou à la désactivation de Halo.

La version **0.2.12** retire aussi les fonds et les ombres des blocs intermédiaires autour du lecteur et du chat Twitch, y compris lorsqu’ils ont des styles en ligne prioritaires. Le repérage suit les conteneurs réellement présents et les retrouve lorsque Twitch les remplace. Les propriétés d’origine sont restituées en désactivant l’effet. À **0 % d’opacité du fond du chat**, aucun fond gris supplémentaire ne reste derrière les messages ou dans la marge du panneau. Le panneau conserve son opacité réglable. Le halo et le voile sombre ne remplissent plus l’intérieur du rectangle de la vidéo : les coins découpés laissent réellement voir le fond transparent de Zen, y compris avec l’assombrissement actif.

La version **0.2.13** étend le halo dans **les quatre directions sur Twitch**, y compris derrière le chat transparent. Le réglage **Droite** permet toujours de réduire ou de couper cette direction. La projection suit aussi le contour arrondi de l’image : ses coins laissent passer le halo au lieu de découvrir une zone rectangulaire sans lumière. Un masque supplémentaire du lecteur découpe les couches vidéo et les dégradés des commandes natives ensemble. Sans halo, les coins restent transparents. Le voile sombre évite encore l’intérieur du rectangle de l’image.

Le chat utilise le flou déjà présent dans le halo, sans appliquer un second filtre d’arrière-plan qui pouvait cumuler son opacité. Son fond garde l’opacité choisie. Les surfaces de lumière et d’assombrissement sont complémentaires autour de la colonne qui défile, y compris lorsqu’un mode place le chat à l’extérieur : le raccord ne double pas leur intensité.

La version **0.2.14** prend en charge le placement réel du lecteur Twitch en **mode théâtre/Studio** : lorsque Twitch fixe son lecteur à la fenêtre, le halo utilise une surface fixe couvrant la même fenêtre. En mode normal, il retrouve son ancrage dans le conteneur qui défile. Les changements de styles du lecteur et du conteneur sont suivis, y compris lorsque Twitch retire la classe du scroller normal.

Les dégradés noirs des commandes Twitch sont désormais dessinés seulement sur le contour arrondi de l’image affichée. Ils ne couvrent plus les coins découpés ni les marges autour d’une image centrée dans le lecteur théâtre. Les boutons et les menus conservent leur position et leur fonctionnement ; leurs arrière-plans propres restent natifs. Les dégradés d’origine et leurs priorités sont restaurés en quittant l’effet ou en plein écran.

La version **0.2.15** ajoute la liaison optionnelle au complément **Halo Tabs pour Zen 0.1.0**, à charger avec Sine. Une fine bande de couleurs du halo prolonge la lumière derrière les onglets aux mêmes hauteurs, avec l’alpha et l’assombrissement du raccord. La section **Onglets Zen** règle son activation, son intensité et son atténuation vers le bord extérieur. À 100 % d’intensité, la bande conserve la lumière du bord de page. Les préréglages préservent ces choix. Sans complément connecté, cette liaison ne calcule ni ne transmet de bande supplémentaire. Les permissions de l’extension restent identiques.

La version **0.2.16** transmet au complément chaque image calculée pour le halo de la page. L’ancienne limite supplémentaire de 16 images par seconde pouvait décaler les couleurs derrière les onglets lors des mouvements rapides. La fréquence reste celle choisie dans le réglage principal de Halo.

La version **0.2.20** rend carré le grand panneau de Twitch sous la navigation lorsque le halo est actif. Avec **Halo Tabs pour Zen 0.1.4**, le conteneur web du navigateur perd aussi son arrondi pendant l’effet. Ces deux découpes pouvaient laisser voir des quarts de cercle sombres. Le lecteur vidéo et le chat conservent leurs propres coins arrondis ; la désactivation restaure les styles natifs.

La version **0.2.21** réorganise le panneau en réglages courants et sections repliables. La case **Réglages distincts pour YouTube et Twitch** crée deux profils à partir des préférences communes existantes ; chaque site peut ensuite garder son étendue, son flou, son assombrissement et ses autres choix. Décocher la case revient aux préférences communes sans effacer les deux profils, qui sont retrouvés en la recochant. Le panneau garde une taille fixe avec son propre défilement, affiche les commandes sans attendre la réponse des API de l’extension et offre un bouton **↗** pour ouvrir les options dans un onglet.

Le complément est livré séparément avec un installateur local pour Sine existant. Il ajoute une couche lumineuse et conserve les variables de couleur du thème de Zen. Il ne peut pas être installé depuis la boîte des extensions Firefox : son chargement se fait dans Sine. Voir le README du paquet **Halo Tabs** pour l’ajout, la sauvegarde et la désactivation.

## Installation pour l’essayer

1. Si tu utilises l’archive, extrais-la dans un dossier que tu conserveras.
2. Garde **Zen Internet actif**, avec tes réglages de transparence habituels.
3. Saisis `about:debugging#/runtime/this-firefox` dans la barre d’adresse de Zen.
4. Clique sur **Charger un module complémentaire temporaire…**, puis sélectionne le fichier `manifest.json` de ce dossier.
5. Recharge ton onglet YouTube ou Twitch et lance une vidéo, un direct ou une rediffusion (`twitch.tv/videos/…`).
6. Ouvre **Halo** dans le menu des extensions de Zen. Les curseurs s’appliquent immédiatement et se sauvegardent localement.

**Cette version n’est pas signée.** Le chargement est temporaire : il faut la recharger après un redémarrage de Zen. Pour une installation durable, il faudra faire signer une version par Mozilla ; aucun réglage de sécurité de ton navigateur n’est à désactiver.

Pour mettre à jour la version déjà chargée, clique sur **Reload** pour Halo dans `about:debugging`, puis recharge les pages. Les préférences existantes sont conservées. Les permissions sont identiques à celles de la version 0.2.8.

Procédure officielle : <https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/>

## Pour retrouver le rendu demandé

- **Assombrissement : 0 %** conserve ton fond actuel, sans voile sombre ajouté. Le halo coloré reste visible.
- **Assombrissement : 10 à 40 %** ajoute un voile noir translucide derrière la lumière et le contenu. Il n’assombrit pas l’image de la vidéo ni les textes.
- **Toute la page** applique un voile uniforme. **Autour du lecteur** utilise un dégradé qui s’efface en s’éloignant.
- **Étendue** prolonge les bords autour de la vidéo, de 0 à 6 000 pixels CSS par côté, avant les multiplicateurs de direction. En mode **Prolonger les bords**, une couleur au quart du bord supérieur reste au quart du bord supérieur, même si l’étendue change. Seule la partie proche de l’écran est dessinée pour limiter le coût des grandes étendues.
- **Flou général** règle la diffusion de base. Dans **Affiner le rendu → Flou par direction**, chaque côté va de **0 %** (net) à **200 %** (deux fois le flou général). **100 %** conserve le flou général. Par exemple, avec 60 px de flou général, 50 % donne 30 px sur ce côté et 200 % donne 120 px. Si le flou général est à zéro, les quatre côtés restent nets. **Même flou partout · 100 %** réunit les quatre réglages sans modifier le flou général.
- **Intensité**, **saturation** et **luminosité** ne concernent que le halo.
- **Lissage : 0 ms** suit directement les dernières images capturées. Une valeur plus élevée adoucit les changements, avec une réponse volontairement plus lente. Valeur initiale : 60 ms ; une préférence déjà enregistrée est conservée. **Suivre immédiatement les changements de scène** évite ce lissage lorsqu’un changement net des images est détecté. Il s’agit d’une détection heuristique.
- **Cadence maximale : 30 images/s** est le réglage initial. Tu peux choisir jusqu’à 60 images/s, dans la limite des images effectivement fournies par le lecteur et des performances de la machine.
- **Noirs transparents** évite qu’une scène noire dessine un rectangle noir autour du lecteur. Cette option ne touche pas aux noirs de la vidéo elle-même.
- Les réglages **par direction** permettent notamment de réduire la lumière vers les recommandations.
- **Ignorer les bandes noires automatiquement** recherche des marges uniformément noires et symétriques en haut/bas ou à gauche/droite. Le détecteur attend trois images cohérentes en lecture et conserve son cadrage dans les scènes entièrement sombres. Il peut manquer certaines bandes ou confondre un encadrement noir symétrique avec une bande : désactive-le et utilise le recadrage manuel dans ce cas. La vidéo reste entière.

Les trois préréglages changent uniquement le rendu de la lumière. Ils préservent ton choix d’assombrissement et tes directions. Le bouton **Retrouver mon fond · 0 %** retire immédiatement le voile sombre.

Des flous différents par côté nécessitent davantage de calcul. Quand les quatre côtés ont le même flou, Halo conserve son rendu uniforme habituel. Les raccords mélangent les flous des côtés voisins dans les coins, sans ajouter de voile opaque.

## Compatibilité et limites de cette première version

- Cible : Zen sur une base Firefox 140 ou supérieure, YouTube pour ordinateur (pages `/watch`) et Twitch (lecteur principal d’une chaîne et rediffusions `/videos/…`).
- Modes normal, cinéma et plein écran du lecteur : réglables séparément. En plein écran, Zen et le système peuvent imposer un fond opaque ; l’extension ne peut pas garantir la transparence du bureau dans ce mode.
- Le halo est limité au contenu de l’onglet : il ne colore pas les barres du navigateur ni les autres fenêtres.
- L’extension conserve une surface de page transparente ; **la transparence et le flou de la fenêtre restent fournis par ta configuration Zen**. Halo ne les active pas à lui seul.
- Shorts, clips Twitch, lecteurs intégrés sur d’autres sites et fenêtre Picture-in-Picture ne font pas partie de cette version.
- La détection automatique vise uniquement les bandes noires symétriques ; elle ne détecte pas les bandes colorées. Pas de modification de la taille de la vidéo.
- Certaines vidéos protégées ou restrictions de lecture des pixels peuvent empêcher l’effet. Quand seul l’accès aux pixels est bloqué, Halo essaie une projection directe, sans lissage ni traitement des noirs, et affiche un message dans le panneau.
- YouTube, Twitch et les styles de Zen Internet évoluent : leur compatibilité complète dépend aussi de leurs versions et des options activées.

## Si tu ne vois pas le halo

1. Recharge la page après le chargement de l’extension et vérifie que Halo est activé.
2. Lance une vidéo et garde le lecteur visible. Vérifie que son mode est coché dans **Lecture et performances**.
3. Essaie le préréglage **Immersif** avec une scène lumineuse et colorée.
4. Lis le message du panneau pour connaître l’état du lecteur et les éventuelles limites de capture.
5. Vérifie que la transparence fonctionne toujours avec Zen Internet. Le bouton principal de Halo retire ses propres modifications de style ; il permet de comparer.

## Données et fonctionnement

Traitement entièrement local. Les images sont copiées en mémoire dans une petite surface de dessin ; aucune image, URL ou donnée de lecture n’est enregistrée ni envoyée. Seuls les réglages sont stockés. Aucun service distant, aucune télémétrie, aucune dépendance téléchargée à l’exécution.

L’extension demande l’accès à `https://www.youtube.com/*` et `https://www.twitch.tv/*` pour lire le lecteur et ajouter le halo, ainsi qu’au stockage local pour les préférences. Elle ne demande pas l’accès aux autres sites ni à l’historique global.

Les images sont échantillonnées par `requestVideoFrameCallback` quand disponible. Les calculs s’arrêtent à la pause, quand toute l’étendue du halo quitte l’écran ou quand l’onglet est masqué. Si le navigateur suspend la livraison des images d’un lecteur hors écran, le bord encore visible conserve les dernières couleurs reçues. Les styles sont limités à la présence d’un halo actif et sont retirés à la désactivation ou en quittant la page vidéo.

## Source

`zen-bridge.js` : export optionnel de petites bandes de couleurs sur les quatre bords du halo, uniquement pour un complément connecté. Le dossier séparé `halo-zen-tabs` contient le script d’interface Sine, son format de mod, ses préférences et l’installateur local.

`settings.js` : valeurs initiales et validation des réglages. `site.js` : détection du lecteur et intégration au défilement de YouTube ou Twitch. `projection.js` : projection des quatre bords et des coins, géométrie et détection des bandes. `blur.js` : flous par côté et raccords, sur la surface de rendu limitée à la zone utile. `twitch-surfaces.js` : repérage des couches structurelles opaques et restitution de leurs styles. `content.js` : capture, lissage et cycle de vie. `content.css` : styles de compatibilité réversibles. `popup.html`, `popup.css`, `popup.js` : panneau de réglages.

Configuration visée : [Zen Internet](https://addons.mozilla.org/en-US/firefox/addon/zen-internet/).
