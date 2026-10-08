TP ÉLÈVE / MEDISLOT
MEDISLOT / COORDINATION FRONT & BACK 01
Synchroniser deux écrans avec SSE
Vue · Spring Boot · MongoDB
MediSlot affiche les créneaux disponibles. Lorsqu’un utilisateur réserve, les autres écrans doivent
afficher le changement sans rechargement manuel de la page.
Votre mission
Compléter le diffuseur SSE Java et l’abonnement Vue, puis vérifier la synchronisation et la
récupération après une coupure réseau.
Point de départ fourni
Le kit contient une API fonctionnelle, une base MongoDB persistante et une interface Vue. La lecture et
la réservation sont déjà codées. Le flux SSE est volontairement incomplet. Les fichiers à modifier portent
des commentaires TODO.
Fichier Travail à réaliser
SlotEvents.java Enregistrer les abonnés, diffuser, nettoyer les connexions et envoyer un
heartbeat.
app.js Ouvrir le flux, écouter les événements, actualiser et fermer proprement.
Préparer le poste
Disposer de Docker Desktop démarré en mode conteneurs Linux, d’un navigateur, d’un éditeur de code
et du cours SSE. Utiliser exclusivement les données fictives du laboratoire.
Le premier démarrage nécessite Internet pour télécharger les images Docker et les dépendances.
L’archive contient Vue : aucune installation JavaScript supplémentaire n’est demandée.
ÉTAPE 1 / OBSERVER LE MODE MANUEL
MEDISLOT / COORDINATION FRONT & BACK 02
Démarrer et constater le problème
1. Extraire le projet
Extraire Kit_TP_SSE_Depart.zip. Ouvrir un terminal dans le dossier contenant compose.yaml, puis
lancer les commandes ci-dessous.
docker compose up -d --build
docker compose ps
2. Ouvrir deux onglets
Ouvrir http://localhost:8086 dans deux onglets, appelés A et B. Dans A, ajouter un créneau de test.
Recharger B une fois pour que les deux affichent ce créneau.
3. Réserver depuis A
Réserver ce créneau depuis A. Observer B sans le recharger : son état reste ancien, puisque SSE n’est
pas encore implémenté.
4. Comparer avec l’API
Consulter http://localhost:8086/api/slots. Vérifier que le créneau est déjà BOOKED dans la réponse,
alors que B peut encore le présenter comme disponible.
Point de contrôle
L’application démarre et la réservation fonctionne. L’absence de synchronisation automatique est
le comportement initial attendu, pas une panne de MongoDB.
Si nécessaire : docker compose logs --tail 60 api affiche les derniers messages du serveur. Si le port 8086 est occupé, modifier
uniquement le port hôte dans compose.yaml et adapter les URL utilisées.
ÉTAPE 2 / CONSTRUIRE LE DIFFUSEUR JAVA
MEDISLOT / COORDINATION FRONT & BACK 03
Implémenter le contrat du flux
Ouvrir src/main/java/fr/medislot/SlotEvents.java. Le contrôleur appelle déjà subscribe(). La réservation
et la création d’un créneau de test appellent déjà changed(slot) après l’écriture réussie.
Élément Comportement attendu
subscribe() Créer un SseEmitter, le conserver et envoyer ready.
ready Nom exact : ready ; données : {"action":"reload"}.
changed(slot) Diffuser slot-updated à chaque connexion active.
Données du changement slotId, status et version ; aucun bookedBy ou bookingId.
Expiration et fermeture Retirer la connexion concernée.
Erreur d’envoi Retirer le client ; ne pas annuler la réservation déjà enregistrée.
Travail à effectuer
1. Ajouter les imports et une collection adaptée aux accès concurrents.
2. Compléter subscribe et ses callbacks de nettoyage.
3. Ajouter une fonction d’envoi qui isole les erreurs d’une connexion.
4. Compléter changed avec un événement nommé et un contenu JSON.
5. Utiliser un identifiant d’événement local si vous reprenez le contrat détaillé du cours.
Point de contrôle
Après reconstruction, la route doit répondre en text/event-stream et envoyer ready. Une
réservation doit produire slot-updated.
ÉTAPE 3 / VÉRIFIER LE SERVEUR
MEDISLOT / COORDINATION FRONT & BACK 04
Observer le flux avant de brancher Vue
Après chaque modification Java, reconstruire le service API. Ouvrir ensuite un autre terminal
PowerShell pour observer les messages :
docker compose up -d --build api
curl.exe -N http://localhost:8086/api/slots/events
Laisser la commande d’observation ouverte. Depuis le navigateur, créer un nouveau créneau, puis le
réserver. Relever visuellement le nom des messages et les champs reçus. Ctrl+C arrête curl sans
arrêter l’API.
Ajouter le signal périodique
Dans SlotEvents, ajouter une méthode planifiée qui envoie un commentaire keepalive aux connexions.
Le laboratoire utilise un intervalle de 15 secondes. Le planificateur Spring est déjà activé dans
Application.java.
Action Résultat à observer
Ouvrir le flux ready apparaît.
Créer un créneau slot-updated apparaît avec son identifiant.
Réserver le créneau Un nouveau slot-updated indique BOOKED.
Ne rien faire Des commentaires keepalive apparaissent.
Fermer curl puis réserver La réservation continue à fonctionner.
Point de contrôle
Les événements ont une ligne vide de séparation. Le terminal reçoit les messages au fil des
actions, pas uniquement à la fermeture de la connexion.
ÉTAPE 4 / COMPLÉTER APP.JS
MEDISLOT / COORDINATION FRONT & BACK 05
Brancher Vue et actualiser les données
Ouvrir src/main/resources/static/app.js. Conserver les fonctions reload, reserve et createSlot fournies.
Elles traitent déjà les opérations HTTP et les données de l’écran.
Travail à effectuer
1. Ouvrir un seul EventSource lorsque le composant est monté.
2. Écouter ready : afficher un état connecté et relire la liste.
3. Écouter slot-updated : appeler reload.
4. À une erreur de connexion, afficher un état interrompu sans appeler close dans ce gestionnaire.
5. Au démontage, fermer le flux et conserver la protection stopped.
6. Laisser le polling désactivé pour les premiers essais.
Charger votre nouvelle version
docker compose up -d --build api
Recharger A et B une fois pour charger le JavaScript modifié. Ouvrir les outils de développement de B,
onglet Réseau, puis repérer /api/slots/events.
Dans le réseau Ce qu’il faut retrouver
Flux SSE Une connexion qui reste ouverte.
Après ready Une relecture GET /api/slots.
Après une réservation dans A slot-updated puis une nouvelle lecture dans B.
Point de contrôle
Dans B, le statut du créneau et son bouton changent sans navigation de la page. B ne doit pas
afficher une confirmation personnelle pour la réservation de A.
ÉTAPE 5 / TESTER LE PARCOURS COMPLET
MEDISLOT / COORDINATION FRONT & BACK 06
Vérifier avec plusieurs observateurs
Utiliser un nouveau créneau pour chaque réservation. Le bouton Ajouter un créneau de test permet de
poursuivre sans supprimer les données existantes.
Manipulation Comportement attendu
Ajouter un créneau dans A Il apparaît dans B grâce au flux.
Réserver dans A A reçoit la confirmation de son POST.
Regarder B sans actualiser Le créneau devient réservé et son bouton indisponible.
Ouvrir un troisième onglet Il obtient immédiatement l’état courant après connexion.
Fermer B puis réserver depuis A L’action reste acceptée et le troisième onglet est actualisé.
Recharger plusieurs fois un onglet Après stabilisation, une seule connexion SSE y reste active.
Isoler les problèmes
Si l’écran ne change pas, suivre cet ordre : vérifier l’écriture via GET /api/slots, vérifier l’émission côté
Java, vérifier la réception du flux, puis vérifier l’appel de reload et l’état Vue.
Point de contrôle
Le test porte sur le second onglet, celui qui ne fait pas la réservation. Une mise à jour dans A seule
ne démontre pas que SSE fonctionne.
ÉTAPE 6 / RETROUVER L’ÉTAT COURANT
MEDISLOT / COORDINATION FRONT & BACK 07
Couper puis rétablir la connexion
Scénario de coupure
1. Dans les outils de développement de B, choisir le mode réseau Offline.
2. Depuis A, créer puis réserver un nouveau créneau.
3. Vérifier que B signale l’interruption dès qu’elle est détectée.
4. Remettre B en mode Online, sans recharger la page.
5. Attendre la reconnexion et vérifier que le nouveau créneau apparaît réservé.
Utiliser le mode hors ligne du navigateur pour ce seul onglet. Selon le navigateur, Offline peut laisser un
flux déjà ouvert actif : vérifier la coupure dans Réseau. Si le flux continue, utiliser le redémarrage de
l’API décrit ci-dessous pour provoquer une vraie interruption ; ce second test vérifie la reconnexion, pas
les changements effectués hors ligne.
Point de contrôle
La récupération doit être déclenchée par le nouvel abonnement et la relecture. Le laboratoire n’a
pas de journal de replay : ne pas supposer que tous les anciens événements seront renvoyés.
Ajouter le filet de sécurité
Après réussite du test SSE seul, ajouter une relecture périodique toutes les 30 secondes. Conserver la
référence du minuteur et l’arrêter au démontage. Vérifier que cette relecture ne crée pas de nouvelle
connexion SSE.
Tester un redémarrage de l’API
docker compose restart api
Laisser les onglets ouverts. Après le retour du serveur, vérifier la reconnexion, la relecture et la
conservation des réservations dans MongoDB.
ÉTAPE 7 / STABILISER LE FONCTIONNEMENT
MEDISLOT / COORDINATION FRONT & BACK 08
Vérifications finales et ressources
À vérifier Comportement attendu
Synchronisation Un changement dans A est visible dans B sans rechargement.
Flux nommé ready et slot-updated sont écoutés avec les mêmes noms des deux côtés.
Coupure réseau L’interface explique la coupure et retrouve l’état actuel après reconnexion.
Nettoyage Les connexions et minuteurs sont libérés à la fin du composant.
Confidentialité du flux Les données diffusées restent limitées aux disponibilités.
Confirmation Seule la réponse du POST personnel confirme la réservation.
Persistance Le redémarrage de l’API conserve les créneaux réservés.
Arrêter le laboratoire
docker compose stop
Les données restent dans le volume MongoDB du projet. Ne pas supprimer le volume pour arrêter ou
redémarrer une séance.
Pour les explications et l’anatomie du code, consulter le cours SSE : contrôleur, diffuseur, EventSource,
relecture et reconnexion. Les versions et limites du kit sont précisées dans son README.
Référence navigateur : EventSource et SSE
https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events