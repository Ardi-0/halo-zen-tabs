# Halo Tabs pour Zen

Mod [Sine](https://github.com/CosmoCreeper/Sine) qui prolonge la lumière de l’extension Halo derrière les onglets de Zen. Le bord de la page et celui de la barre d’onglets utilisent les mêmes couleurs et la même transparence ; la lumière diminue vers le bord extérieur.

## Publier et installer

1. Dans Sine, installe ou mets à jour le mod depuis [`Ardi-0/halo-zen-tabs`](https://github.com/Ardi-0/halo-zen-tabs).
2. Sine doit autoriser les scripts des dépôts personnels pour charger ce mod JavaScript. Active cette possibilité dans Sine si le mod apparaît mais que son script ne s’exécute pas, puis redémarre Zen si Sine le demande.
3. Charge aussi l’extension Firefox **Halo 0.2.19** fournie dans `halo-extension/`. Pour un chargement temporaire, ouvre `about:debugging#/runtime/this-firefox`, choisis **Charger un module complémentaire temporaire…** et sélectionne `halo-extension/manifest.json`. Un module temporaire doit être rechargé après chaque redémarrage de Zen.
4. Ouvre une vidéo YouTube ou Twitch. Dans le panneau Halo, la section **Onglets Zen** doit afficher **Complément Zen connecté**.

Le mod Sine ajoute la lumière dans l’interface de Zen. L’extension Firefox capture les bords de la vidéo et fournit les couleurs ; les deux sont nécessaires.

## Réglages

Dans le panneau Halo, **Prolonger le halo derrière les onglets** active l’effet. **Intensité dans les onglets** règle sa force au raccord (100 % par défaut). **Atténuation vers le bord extérieur** règle la disparition progressive (60 % par défaut). Les autres réglages de couleur, de flou, de noirs transparents et d’assombrissement suivent le halo de la page.

Seul l’onglet actif éclaire sa barre latérale. Changer d’onglet, quitter une vidéo, désactiver l’effet ou passer en plein écran retire la lumière. Le script ne remplace pas les couleurs ni les contrôles du thème Zen. Un élément opaque ajouté par un autre thème peut toutefois masquer la lumière.

## Données et compatibilité

La liaison entre Halo et le mod reste dans le navigateur : elle transmet de petites bandes de couleurs RGBA prélevées sur les bords du halo et le niveau d’assombrissement, pas l’image complète de la vidéo. Elle n’envoie pas ces données à un service distant.

Depuis Halo 0.2.16, cette bande est transmise à chaque image calculée par le halo de la page. Le complément n’ajoute plus sa propre limite de 16 images par seconde, qui pouvait retarder les couleurs dans les onglets.

La version 0.1.2 du mod retire le calque supplémentaire de marges et de coins de la version 0.1.1. Quand le halo est actif, elle désactive uniquement l’ombre du conteneur web de l’onglet actif, responsable du contour sombre autour de la page. L’ombre revient au changement d’onglet ou à la désactivation du halo. Halo 0.2.18 retire les échantillons horizontaux qui n’étaient utilisés que par l’ancien calque. La liaison synchronisée derrière les onglets reste active.

Le mod 0.1.3 et Halo 0.2.19 complètent les petites séparations que Zen réserve autour de la vue web. Quatre bandes légères reprennent les couleurs des bords de la page jusqu’au bord intérieur de Zen, sans modifier la taille de la vidéo, de la page ou des contrôles. Elles ne couvrent que les marges mesurées et disparaissent quand le halo est désactivé.

Le code a été validé dans un banc de test simulant l’interface native, la page et leur liaison. Il n’a pas encore été testé dans le profil Zen de l’utilisateur. Les vues divisées et certains modes compacts restent à confirmer.

Pour désactiver l’effet, décoche l’option dans Halo ou la préférence du mod Sine. Pour retirer le script, désinstalle le mod depuis Sine et redémarre Zen.

Le format `theme.json` et l’installation par URL correspondent au [gestionnaire officiel de Sine](https://github.com/CosmoCreeper/Sine/blob/main/src/core/manager.sys.mjs). Licence : [MIT](LICENSE).
