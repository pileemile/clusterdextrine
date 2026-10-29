TP ÉLÈVE / MEDISLOT
MEDISLOT / COORDINATION FRONT & BACK 01
Construire une recherche réactive
Vue · Spring Boot · MongoDB
MediSlot permet de rechercher des professionnels par nom ou spécialité. La version fournie fonctionne
avec un bouton. Votre mission est de déclencher la recherche pendant la saisie, sans multiplier
inutilement les appels et sans afficher de réponses dépassées.
Fonctionnement attendu
Après une courte pause, les résultats de la saisie actuelle apparaissent. Une ancienne réponse ne
doit jamais remplacer les résultats plus récents, même si elle arrive plus tard.
Le point de départ
Le kit contient l’API Java, MongoDB, 12 profils fictifs, le HTML, le CSS et une recherche manuelle. Les
parties à compléter sont repérées dans src/main/resources/static/app.js. Aucune correction de la
recherche réactive n’est incluse.
À réaliser Mécanisme à utiliser
Déclencher après une pause Observer la saisie et gérer un minuteur.
Abandonner l’appel précédent AbortController.
Refuser les réponses anciennes Identifiant local de génération.
Informer l’utilisateur États attente, chargement, résultat, vide et erreur.
Nettoyer au départ Annuler le minuteur et la requête active.
Préparer Docker Desktop en mode conteneurs Linux, un navigateur et un éditeur. Utiliser uniquement
les données fictives du laboratoire. Le cours associé explique le code et les mécanismes.
ÉTAPE 1 / PRENDRE EN MAIN LE KIT
MEDISLOT / COORDINATION FRONT & BACK 02
Lancer et explorer la recherche manuelle
Extraire Kit_TP_Recherche_Reactive_Depart.zip. Ouvrir un terminal dans le dossier contenant
compose.yaml. Démarrer le projet :
docker compose up -d --build
docker compose ps
Ouvrir http://localhost:8090. Saisir martin et cliquer sur Rechercher. Vérifier que Claire Martin et Thomas
Martin apparaissent.
Observer les échanges
Ouvrir les outils de développement, onglet Réseau, puis filtrer sur professionals. Comparer le paramètre
q, le statut et les données renvoyées. Tester aussi la route suivante dans un nouvel onglet :
http://localhost:8090/api/professionals?q=martin
Essai manuel Résultat attendu
cardiologue Deux profils du jeu initial.
zzzzz Aucun résultat.
erreur Erreur HTTP 503 simulée.
PÉDIATRE puis pediatre Les mêmes professionnels.
Point de contrôle
Le bouton fonctionne et l’API répond. La saisie seule ne lance pas encore la recherche : c’est la
partie à construire.
Si le port 8090 est occupé, modifier le port hôte dans compose.yaml puis adapter les adresses du TP. Pour consulter les
erreurs : docker compose logs --tail 60 api.
ÉTAPE 2 / AJOUTER LE DEBOUNCE
MEDISLOT / COORDINATION FRONT & BACK 03
Déclencher après une pause
Ouvrir app.js. Conserver les valeurs réactives déjà utilisées par le template : query, results,
displayedQuery, state et error. Le message statusText est déjà calculé à partir de ces valeurs.
Travail à effectuer
1. Observer query avec watch.
2. Créer une fonction de planification appelée à chaque changement.
3. Conserver une référence de minuteur hors de cette fonction.
4. Annuler le minuteur précédent avant d’en créer un nouveau.
5. Lancer l’appel après 300 ms sans nouvelle saisie.
6. Ne rien envoyer si le texte nettoyé fait moins de 2 caractères ou dépasse 60 caractères.
7. Réutiliser cette planification pour le bouton Rechercher.
Charger le code modifié
docker compose up -d --build api
Recharger une fois le navigateur. Effacer la liste des requêtes dans Réseau. Saisir martin rapidement,
sans pause supérieure au délai choisi.
Point de contrôle
Un seul appel part après la pause finale pour cette rafale de frappes. Une saisie volontairement
lente peut produire plusieurs appels : ce n’est pas un échec du debounce.
Ne pas ajouter un second déclenchement direct avec @input dans index.html. Le champ est déjà relié à
query par v-model. Le cours explique les minuteurs pages 7 et 8, puis leur intégration page 15.
ÉTAPE 3 / AJOUTER ABORTCONTROLLER
MEDISLOT / COORDINATION FRONT & BACK 04
Annuler les appels devenus inutiles
Travail à effectuer
1. Créer un nouveau contrôleur pour chaque appel envoyé.
2. Transmettre son signal à fetch.
3. Conserver la référence du contrôleur actif.
4. À chaque nouvelle saisie, annuler l’appel précédent s’il existe.
5. Ne pas afficher une erreur utilisateur pour AbortError.
6. Vérifier response.ok avant de lire les données comme un résultat réussi.
Utiliser les ralentissements du laboratoire
Saisie Comportement de l’API en profil lab
ma Réponse retardée de 1 200 ms.
mar Réponse retardée de 100 ms.
Autre texte valide Réponse retardée de 180 ms.
erreur Réponse 503 volontaire.
Saisir ma et attendre que sa requête apparaisse dans Réseau. Modifier rapidement la saisie en mar.
Examiner le premier appel et le résultat affiché après le second.
Point de contrôle
L’ancienne requête est annulée côté navigateur. Cette annulation ne doit pas provoquer un
message d’erreur ni empêcher les résultats de mar de s’afficher.
L’annulation côté navigateur ne prouve pas l’arrêt du traitement Java ou MongoDB. La protection
logique de l’étape suivante reste obligatoire. Référence du cours : page 16.
ÉTAPE 4 / AJOUTER UN IDENTIFIANT DE RECHERCHE
MEDISLOT / COORDINATION FRONT & BACK 05
Protéger l’écran des réponses anciennes
Travail à effectuer
1. Déclarer un compteur local hors de la fonction de recherche.
2. L’incrémenter dès chaque nouvelle saisie, avant le délai et les contrôles de longueur.
3. Capturer sa valeur pour chaque recherche programmée.
4. Comparer l’identifiant après les opérations asynchrones, avant de modifier l’écran.
5. Appliquer la protection aux résultats, au texte affiché et aux erreurs.
6. Empêcher une ancienne fin de traitement de modifier le chargement d’une nouvelle recherche.
Prouver que la protection fonctionne seule
Dans votre copie de travail, désactiver temporairement seulement l’appel à abort, en conservant le
signal et le compteur. Reconstruire et recharger. Envoyer ma, attendre son départ, puis envoyer mar
avant le retour de ma.
Point de contrôle
Les résultats de mar apparaissent et restent affichés lorsque ma finit. L’écran conserve Claire
Martin, Hugo Marchand et Thomas Martin. Les réponses dépassées ne modifient plus l’interface.
Recommencer en effaçant complètement le champ pendant une recherche lente. Aucun ancien résultat
ne doit réapparaître. Réactiver abort après ce test, reconstruire et recharger.
Le compteur doit changer même quand le champ devient vide. Consulter les explications pages 15, 17
et 18 du cours.
ÉTAPE 5 / AFFICHAGE ET NETTOYAGE
MEDISLOT / COORDINATION FRONT & BACK 06
Rendre les états compréhensibles
Situation Comportement attendu
Saisie trop courte Invitation à saisir au moins deux caractères.
Debounce en cours État waiting ; aucune ancienne carte ambiguë.
Requête envoyée État loading et message de recherche en cours.
Résultats trouvés Liste et texte correspondant à la recherche courante.
Tableau vide reçu État empty, distinct d’une erreur.
503 ou coupure réseau État error et possibilité de réessayer.
Annulation volontaire Aucun message d’échec affiché.
Compléter les interactions
Le bouton Réessayer doit passer par la même planification que la recherche. Conserver le label du
champ, la zone de statut et les identifiants stables de la liste. Ne pas déplacer le focus à l’arrivée des
résultats.
Nettoyer au démontage
Utiliser onUnmounted pour arrêter le minuteur, annuler la requête et invalider les traitements encore
actifs. Éviter tout changement d’état après le démontage.
Point de contrôle
Une erreur ancienne ne remplace pas un succès plus récent. Une saisie vide ne laisse pas un
chargement permanent. Le clavier reste utilisable pendant la recherche.
ÉTAPE 6 / TESTER LES LIMITES
MEDISLOT / COORDINATION FRONT & BACK 07
Vérifier le contrat front et back
Effectuer ces essais avec le navigateur et, lorsque le front bloque volontairement la saisie, directement
avec l’adresse de l’API.
Essai Comportement attendu
q=a dans l’API 400 : la validation existe aussi côté serveur.
q absent dans l’API 400 : le paramètre est requis.
q=martin 200 ; champs publics id, name, specialty, city.
q=zzzzz 200 avec items vide.
q=.* Aucun profil du jeu initial ; les caractères restent littéraux.
pediatre et PÉDIATRE Même liste.
Changer très vite de texte L’écran final correspond uniquement à la dernière saisie.
Effacer pendant le chargement Aucun résultat ancien ne revient.
La ville est affichée mais ne fait pas partie des champs recherchés. Le plafond est de 20 éléments ; le
nombre affiché ne prétend pas être le total des correspondances dans toute la base.
Contrôle technique
Comparer la saisie finale, le q de la requête acceptée et le champ query de la réponse. Vérifier
également que searchName et searchSpecialty ne sont pas exposés dans la réponse publique.
Les appels peuvent se terminer dans un autre ordre que leur départ. Faire les essais avec les délais du
profil lab pour vérifier le cas difficile, pas seulement avec une API rapide.
ÉTAPE 7 / STABILISER LA RECHERCHE
MEDISLOT / COORDINATION FRONT & BACK 08
Vérifications finales et arrêt
À contrôler Résultat attendu
Déclenchement La recherche fonctionne sans clic obligatoire.
Temporisation Le dernier minuteur remplace le précédent.
Annulation Le contrôleur actif est annulé à la nouvelle saisie.
Protection logique Une ancienne réponse ou erreur n’écrase pas l’état récent.
Effacement Le champ vide arrête les travaux et retire les résultats.
Reprise Une nouvelle saisie fonctionne après une erreur.
Accessibilité Label associé, message lisible, focus conservé.
Nettoyage Aucun minuteur ou appel utile au composant ne reste actif après son
démontage.
Arrêter le laboratoire
docker compose stop
La commande conserve les données MongoDB. Ne pas supprimer le volume pour un simple arrêt. Les
données fictives absentes sont créées au démarrage sans écraser les documents existants.
Pour retrouver les explications : code front pages 13 à 19 du cours ; démonstration pages 21 et 22 ;
fiche récapitulative page 24. Les limites et versions du kit figurent aussi dans son README.
Documentation Vue - watch
https://vuejs.org/guide/essentials/watchers.html
Documentation navigateur - AbortController
https://developer.mozilla.org/en-US/docs/Web/API/AbortController