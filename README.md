# Halo Tabs pour Zen

Mod [Sine](https://github.com/CosmoCreeper/Sine) qui prolonge la lumière de l’extension Halo derrière les onglets de Zen. Le bord de la page et celui de la barre d’onglets utilisent les mêmes couleurs et la même transparence ; la lumière diminue vers le bord extérieur.

## Publier et installer

1. Crée un dépôt GitHub public avec la branche par défaut `main`.
2. Ajoute **le contenu de ce dossier** à la racine du dépôt. `theme.json`, `halo-tabs.uc.js` et `preferences.json` doivent être directement visibles sur GitHub.
3. Dans Sine, installe le mod depuis l’URL du dépôt, par exemple `https://github.com/TON-COMPTE/halo-zen-tabs`.
4. Sine doit autoriser les scripts des dépôts personnels pour charger ce mod JavaScript. Active cette possibilité dans Sine si le mod apparaît mais que son script ne s’exécute pas, puis redémarre Zen si Sine le demande.
5. Charge aussi l’extension Firefox **Halo 0.2.16** fournie dans `halo-extension/`. Pour un chargement temporaire, ouvre `about:debugging#/runtime/this-firefox`, choisis **Charger un module complémentaire temporaire…** et sélectionne `halo-extension/manifest.json`. Un module temporaire doit être rechargé après chaque redémarrage de Zen.
6. Ouvre une vidéo YouTube ou Twitch. Dans le panneau Halo, la section **Onglets Zen** doit afficher **Complément Zen connecté**.

Le mod Sine ajoute la lumière dans l’interface de Zen. L’extension Firefox capture les bords de la vidéo et fournit les couleurs ; les deux sont nécessaires.

## Réglages

Dans le panneau Halo, **Prolonger le halo derrière les onglets** active l’effet. **Intensité dans les onglets** règle sa force au raccord (100 % par défaut). **Atténuation vers le bord extérieur** règle la disparition progressive (60 % par défaut). Les autres réglages de couleur, de flou, de noirs transparents et d’assombrissement suivent le halo de la page.

Seul l’onglet actif éclaire sa barre latérale. Changer d’onglet, quitter une vidéo, désactiver l’effet ou passer en plein écran retire la lumière. Le script ne remplace pas les couleurs ni les contrôles du thème Zen. Un élément opaque ajouté par un autre thème peut toutefois masquer la lumière.

## Données et compatibilité

La liaison entre Halo et le mod reste dans le navigateur : elle transmet une bande de 192 couleurs RGBA et le niveau d’assombrissement, pas l’image complète de la vidéo. Elle n’envoie pas ces données à un service distant.

Depuis Halo 0.2.16, cette bande est transmise à chaque image calculée par le halo de la page. Le complément n’ajoute plus sa propre limite de 16 images par seconde, qui pouvait retarder les couleurs dans les onglets.

Le code a été validé dans un banc de test simulant l’interface native, la page et leur liaison. Il n’a pas encore été testé dans le profil Zen de l’utilisateur. Les vues divisées et certains modes compacts restent à confirmer.

Pour désactiver l’effet, décoche l’option dans Halo ou la préférence du mod Sine. Pour retirer le script, désinstalle le mod depuis Sine et redémarre Zen.

Le format `theme.json` et l’installation par URL correspondent au [gestionnaire officiel de Sine](https://github.com/CosmoCreeper/Sine/blob/main/src/core/manager.sys.mjs). Licence : [MIT](LICENSE).
