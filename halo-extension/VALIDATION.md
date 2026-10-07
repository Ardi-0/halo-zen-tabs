# Validation — Halo 0.2.16

Vérification de la version 0.2.16 : le complément suit la cadence du halo de page au lieu de limiter ses mises à jour à 16 images par seconde. Les régressions Twitch, timeline YouTube, panneau et liaison avec Zen ont été rejouées le 7 octobre 2026. Ces tests simulent l’interface de Zen ; le rendu dans le profil réel reste à vérifier.

## Environnement

Tests automatisés dans Chrome avec Playwright, sur des pages reproduisant la structure YouTube ou Twitch et les fonds transparents de Zen Internet. Une balise vidéo lit un flux synthétique animé. Les API d’extension sont simulées. Ces tests ne remplacent pas une vérification du rendu dans chaque version de Zen, YouTube et Twitch.

## Complément Zen / Sine

`work/test-zen-tabs.cjs` exécute l’extension et le script de production Halo Tabs dans un banc Chrome à deux contextes. Une iframe représente le contenu et les API `gBrowser`, `Services.prefs` et `messageManager` sont simulées. Le code de transport du complément est exécuté ; l’identité `content.top` est adaptée pour représenter un contenu de navigateur de premier niveau. Ce banc ne valide pas le moteur réel de Firefox ni le chargement par Sine.

Onze groupes passent sans erreur : absence de bande exportée sans consommateur, liaison locale et géométrie inchangée des contrôles, couleurs rouge/bleu, réglages et menus, rejet des données malformées et des URI étrangères, changement d’onglet, désactivation via Halo/Sine, scroll en pause, sidebar à droite, raccord multicolore, échelle/décalage de la vue web, retrait complet des marqueurs et du canvas. Les raccords comparés sur un fond commun restent sous huit niveaux par canal sur 255, également avec les voiles uniforme et local à 25 %. La capture `work/zen-tabs-preview.png` est une démonstration synthétique.

L’installateur PowerShell est vérifié sur un profil Sine synthétique dans le workspace : `-WhatIf` sans écriture, copie du mod, sauvegarde exacte de la configuration, conservation des autres mods et de leurs valeurs, désactivation sans suppression et réinstallation. Le fichier JSON est remplacé via un fichier temporaire et une sauvegarde. Aucun profil réel n’a été modifié : l’accès au profil Zen est refusé dans cet environnement. Le paquet nécessite une installation et une vérification dans Sine par l’utilisateur. Les variations de thèmes, modes compacts et vues divisées restent à vérifier.

## Twitch

La structure d’un direct Twitch a été réinspectée dans un onglet de test distinct : lecteur `.persistent-player`, défilement `.root-scrollable__wrapper`, chat et emplacement réservé au lecteur. Le chat contient un bloc opaque à classe générée entre `.channel-root__right-column` et `.chat-shell`, en plus des fonds de `.chat-room`. Sous la vidéo, l’emplacement réservé contient un wrapper noir mis à l’échelle (`transform: scale(2)`) et un enfant compensé à `scale(0.5)`. Des sélecteurs couvrant seulement les composants nommés ne suffisent pas à neutraliser toutes ces couches.

La fixture contient des wrappers opaques, des ombres, des priorités `!important` et le dégradé supérieur du lecteur observé sur Twitch. Les fonds intermédiaires sont neutralisés et restitués comme en 0.2.12. La version 0.2.13 supprime l’exclusion du chat et remplace le trou rectangulaire de la projection par le contour arrondi de la vidéo. Avec une scène bleue, les quatre coins ont désormais la couleur du halo et une opacité partielle, à 24 et 64 px. Sans halo, les coins sont entièrement transparents, y compris avec l’assombrissement ; à 0 px d’arrondi, la vraie vidéo remplit de nouveau le coin. Le masque explicite du lecteur découpe aussi les couches natives. Le voile sombre reste exclu de l’intérieur du rectangle de l’image. Le rendu est testé dans Chrome sur `work/fixture-twitch.html` avec une vidéo synthétique, pas dans le Zen de l’utilisateur. `work/test-twitch.cjs` passe ses onze groupes de scénarios :

Le mode théâtre a aussi été inspecté sur le site Twitch dans un onglet distinct. Le lecteur passe de position absolue à position fixe, avec un cadre de 940 × 720 px dans cette inspection ; le scroller perd sa classe `.root-scrollable` et utilise `.channel-root__scroll-area--theatre-mode`. La barre supérieure conserve un dégradé noir et mesure 120 px. La fixture précédente gardait un lecteur absolu : elle ne reproduisait pas ce comportement. La fixture corrigée échoue sur l’archive 0.2.13 : le halo reste absolu dans la colonne à x=80, y=50, au lieu de couvrir la fenêtre en position fixe. Le nouveau code passe ce contrôle ainsi que les pixels des coins et des marges. La correction n’a pas été injectée dans l’onglet réel ni chargée dans le Zen de l’utilisateur.

Le même test exécuté sur l’archive 0.2.12 échoue au contrôle du halo derrière le chat et dans les coins : leurs pixels ont un alpha nul malgré une scène bleue lumineuse. Il reproduit ainsi la zone rectangulaire sans halo corrigée par le nouveau contour arrondi.

- Couleurs successives rouge/bleu capturées et visibles sous le lecteur, fonds structurels transparents.
- Pixels rouges/bleus présents derrière le header, la colonne de gauche et le chat transparent. Lumière présente dans les coins arrondis 24/64 px sans remplissage opaque. À 0 px, la vraie vidéo remplit les coins. Le réglage Droite à 0 % retire la lumière sous le chat.
- Chat déplacé hors du conteneur de défilement : lumière visible dans la bande droite et raccord sans double opacité. Le halo reste visible après masquage du chat et élargissement de la colonne.
- Dimensions des commandes, de la timeline Twitch synthétique et position de son curseur identiques avant/après activation.
- Chat : panneau arrondi de 16 px, opacité vérifiée par les pixels à 0/20/45/80 % avec l’intensité du halo à zéro pour isoler le fond, marge transparente, couleurs de base claires et sombres, saisie locale, boutons et messages conservés. Un wrapper opaque remplacé est automatiquement neutralisé. Une nouvelle couleur de fond native avec priorité `!important` est mémorisée puis restituée en désactivant le style. Le filtre d’arrière-plan supplémentaire est retiré : il doublait l’alpha de la lumière et du voile translucides sous le panneau.
- Noirs transparents jusque dans le header et la colonne gauche ; assombrissement uniforme à 25 % cohérent dans ces zones, sous le lecteur et sous le chat à 0 % d’opacité ; coins transparents sans halo avec assombrissement uniforme ou local ; flous par direction, arrondi et bouton du chat accessible.
- Défilement du conteneur Twitch, halo encore visible après la sortie du lecteur, arrêt après sortie complète, style du chat conservé quand le halo sort du champ, pause sans nouvelles captures, aucune hauteur de défilement ajoutée et réduction correcte quand le contenu raccourcit.
- Théâtre simulé avec la géométrie native observée : lecteur fixé à la fenêtre, changement de classe du scroller, halo fixe de 1280 × 720 px, lumière dans les quatre coins de l’image et autour, y compris derrière le chat. La barre supérieure de 120 px recouvre normalement les coins d’une image 16:9 centrée à y=78,75 px : le nouveau masque exclut ses coins et les marges, tout en conservant le dégradé à l’intérieur de l’image. Sans halo, ces zones ont un alpha nul. Les dimensions des commandes restent identiques. Le scroll du contenu ne déplace pas le lecteur ni son halo.
- Filtre du mode théâtre, plein écran sans arrondi, retour au halo fixe en théâtre puis à l’ancrage qui défile en mode normal. Un nouveau dégradé natif en ligne avec priorité importante est masqué correctement puis restitué à la désactivation.
- Désactivation sur l’accueil, les listes et le mini-lecteur ; activation sur `/videos/…`.
- Remplacement de la vidéo, navigation entre chaînes et restitution des fonds, ombres et priorités en ligne à la désactivation, sans attribut de couche résiduel.

`work/test-chat-panel.cjs` vérifie la migration des préférences existantes, les bornes d’opacité, la sauvegarde et la réouverture du panneau, la désactivation du curseur et la conservation des choix du chat lors d’un préréglage de lumière. Les captures synthétiques sont `work/twitch-halo-preview.png`, `work/twitch-chat-preview.png`, `work/twitch-chat-transparent.png` (arrière-plan de bureau simulé uniquement dans le test) , `work/twitch-theater-preview.png` et `work/popup-twitch-chat.png`. Les contrôles Twitch restent natifs ; l’adaptation de timeline est propre à YouTube. Les variantes réelles du mode Studio/cinéma Twitch et les contenus protégés restent à vérifier dans Zen.

## Régressions YouTube

Les 22 scénarios de `work/test-halo.cjs` passent sans erreur JavaScript : capture des couleurs de la vidéo, noirs transparents, alignement des quatre bords, directions asymétriques, détection des bandes noires, changements de plan, assombrissement, pause, activation et modes, navigation YouTube, remplacement du lecteur, plein écran, maintien du bord au scroll, arrêt après sa sortie complète, repli si les pixels sont protégés, intensité nulle, panneau et stockage.

L’étendue de 6 000 px, avec un multiplicateur de 150 %, conserve le bord inférieur jusqu’à sa sortie du champ. Les textures restent sous la limite de 1 024 pixels par axe. Une marge autour du champ visible permet de déplacer la page sans recalculer continuellement leur taille.

## Stabilité du défilement

`work/test-scroll-appearance.cjs` compare les pixels composités à des positions identiques dans le document avant et après défilement. Il couvre 42 combinaisons : quatre étendues (180, 600, 1 800 et 6 000 px), trois flous uniformes (0, 65 et 160 px), deux profils de flou directionnel et trois positions de défilement.

Les comparaisons passent avec une différence moyenne inférieure à 1,1 niveau sur 255 et un écart maximal inférieur à 9 niveaux. La rasterisation du flou CSS peut produire de faibles variations ; on ne revendique pas une identité parfaite de tous les pixels. Sur cette exécution, sans flou, l’écart maximal reste inférieur à deux niveaux.

Les tests vérifient également que :

- la taille de la texture et sa position dans le document restent constantes pendant les premiers déplacements dans la marge préchargée ;
- le halo se déplace avec le document immédiatement après un scroll, avant tout callback JavaScript ;
- l’étendue maximale n’ajoute ni hauteur de page ni défilement horizontal ;
- la pause ne provoque pas de nouvelles captures d’images pendant le scroll.

## Application dans Zen

Après rechargement de l’extension temporaire, il faut recharger les onglets YouTube et Twitch déjà ouverts pour appliquer le nouveau script. Le panneau affiche `v0.2.16`. Les réglages et les permissions sont conservés. Aucun profil Zen ni thème réel n’a été modifié dans cet environnement. La version 0.2.16 n’a pas été rechargée automatiquement dans le navigateur de l’utilisateur.

La version reste non signée et doit être rechargée après un redémarrage du navigateur. Le comportement réel dépend aussi des styles de YouTube, de Zen Internet et de la version de Zen.

## Timeline en mode cinéma

Le diagnostic de la version 0.2.10 a confirmé dans un onglet YouTube distinct un lecteur de 1 264,8 × 551 px contenant une vidéo de 980 × 551 px, placée à 143 px de son bord gauche. La vidéo native utilise `object-fit: cover` dans ce rectangle déjà dimensionné au bon format. Cette valeur ne doit donc pas être appliquée au grand rectangle du lecteur pour déterminer le cadrage.

La fixture précédente calculait les interactions à partir de la barre déjà redimensionnée et ne détectait pas le problème signalé. Elle utilise désormais un cache calculé depuis le cadre du lecteur pour le survol, les clics, les chapitres, la miniature et le curseur. Ce test échoue avec la version 0.2.9 : un survol au quart de la barre ne vise pas le quart de la durée.

`work/test-theater-controls.cjs` passe maintenant ses douze groupes : vidéo 4:3, curseur et barre native, survol/aperçu/clic/glissement/clavier/boutons, modifications des chapitres, vidéo décentrée, anciennes dimensions vidéo en pixels, redimensionnement du lecteur, vidéo carrée, format large, portrait, retour du plein écran et restauration en mode normal/désactivation. Les interactions à 10 %, 50 % et 90 % sont vérifiées sur les formats carré, large et portrait, ainsi qu’après redimensionnement. La miniature reste centrée sur la souris à moins d’un pixel dans la fixture. Les redimensionnements successifs ne font pas rétrécir le lecteur. Le titre conserve sa position après le cadrage d’une vidéo large.

Les surcharges de largeur des commandes, de proportions des chapitres et de translation du curseur sont supprimées. Le cadre réel du lecteur change de taille ; une notification de redimensionnement invite YouTube à recalculer son interface. Les captures synthétiques sont `work/theater-controls.png` et `work/theater-hover-square.png`. Les interactions du lecteur réel avec la modification restent à confirmer dans Zen : la fixture utilise un gestionnaire synthétique du lecteur et aucun correctif n’a été injecté dans l’onglet YouTube d’inspection.

## Arrondi du lecteur

Correction 0.2.6 : `work/test-video-corners.cjs` reproduit d’abord les quatre coins carrés d’une image 4:3 dans un lecteur 16:9 sur la version 0.2.5. Après correction, les dix contrôles passent : image 4:3, portrait, format large, élément vidéo plus étroit que le lecteur, position décentrée, remplissage par `object-fit: cover`, redimensionnement/cinéma, sortie du plein écran, remplacement de la vidéo et nettoyage des styles. Les pixels hors des quatre coins sont transparents et le centre de l’image reste opaque. À 0 px, le coin redevient opaque. Le masque est absent en plein écran, après désactivation et en quittant la page vidéo. Les 22 régressions générales ont aussi été rejouées avec succès. Capture synthétique inspectée : `work/video-corners-portrait.png`. Validation effectuée dans Chrome, sans nouvelle inspection du Zen de l’utilisateur.

Contrôle dans le navigateur de test : valeur initiale de 24 px ; à 64 px, les pixels situés hors du coin arrondi deviennent transparents, tandis que l’image reste opaque au centre. À 0 px, le coin retrouve son opacité. Une entrée réelle via l’API plein écran retire l’arrondi ; la sortie restaure les 64 px choisis. Le mode cinéma conserve également cette valeur. Désactiver Halo retire son attribut et sa variable de style du lecteur. Aucune erreur JavaScript observée. Capture locale : `work/player-rounded-64.png`.

## Couverture du header

`work/test-header.cjs` reproduit un header fixe au-dessus d’une application avec une marge haute qui se propage au corps de page. La version précédente échouait avec une surface commençant à 70 px, laissant le header hors du halo. La correction est vérifiée avec des marges de 0, 70 et 112 px, au repos et après défilement : pixels rouges de la vidéo présents derrière le header, header toujours fixe, halo défilant avec la page, aucune augmentation des dimensions de défilement. La désactivation restaure les styles du corps de page. Le rendu n’a pas été réinspecté dans la fenêtre Zen de l’utilisateur pour cette correction.

## Flou par direction

Les six scénarios de `work/test-directional-blur.cjs` passent :

- Migration des anciennes préférences avec les quatre côtés à 100 %, sans modification du flou général, de l’étendue ni de l’assombrissement ; validation des bornes de 0 à 200 %.
- Mire contrastée : flouter successivement chacun des quatre bords réduit son contraste de 255 à 7–11 niveaux, tandis que les trois autres restent à 255.
- Raccords entre côtés : une couleur translucide conserve son opacité dans les quatre coins, et les pixels transparents restent transparents.
- Mise à jour des réglages en pause, rayon effectif jusqu’à 320 px, textures inférieures à 1 024 px par axe et ancrage natif au scroll.
- Projection agrandie et repli sans lecture des pixels fonctionnels avec les flous directionnels.
- Panneau : sauvegarde et réouverture, préréglages préservant les directions, bouton de retour à 100 % sans modification du flou général ni de l’assombrissement.

Le panneau a été inspecté sur une capture du test. Ces vérifications utilisent Chrome ; cette version n’a pas fait l’objet d’une nouvelle inspection dans le Zen de l’utilisateur.
