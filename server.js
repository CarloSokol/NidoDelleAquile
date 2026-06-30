// 1. Prima di tutto importiamo i pacchetti necessari
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// 2. Creiamo le istanze (inizializziamo il server)
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Database temporaneo in memoria
let ordini = []; 
let idOrdineCorrente = 1;

app.use(express.static('public')); // Cartella per i file HTML (index.html, Cassa.html, Cucina.html, ecc.)

// ---------------------------------------------------------
// GESTIONE DELLE ROTTE (PAGINE WEB)
// ---------------------------------------------------------

// Pagina principale (Gestore o Cliente tramite QR Code)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Schermata per la Cassa
app.get('/cassa', (req, res) => {
    res.sendFile(__dirname + '/public/Cassa.html');
});

// Schermata per i Cuochi in Cucina
app.get('/cucina', (req, res) => {
    res.sendFile(__dirname + '/public/Cucina.html');
});

// ---------------------------------------------------------
// GESTIONE DELLE CONNESSIONI WEBSOCKET (SOCKET.IO)
// ---------------------------------------------------------
io.on('connection', (socket) => {
    console.log('Un dispositivo si è connesso');

    // Riceve un nuovo ordine inviato da un cliente (QR) o cameriere
    socket.on('nuovo_ordine', (datiOrdine) => {
        let nuovoOrdine = {
            id: idOrdineCorrente++,
            tavolo: datiOrdine.tavolo,
            piatti: datiOrdine.piatti,
            stato: 'In Accettazione',
            totale: datiOrdine.totale
        };
        ordini.push(nuovoOrdine);
        io.emit('aggiorna_cassa', ordini);
    });

    // La cassa accetta l'ordine e lo manda ai cuochi
    socket.on('approva_ordine', (id) => {
        let ordine = ordini.find(o => o.id === id);
        if (ordine) {
            ordine.stato = 'In Cucina';
            io.emit('aggiorna_cassa', ordini);
            io.emit('aggiorna_cucina', ordini.filter(o => o.stato === 'In Cucina'));
        }
    });

    // La cassa rifiuta l'ordine e lo cancella dal flusso di lavorazione
    socket.on('cancella_ordine_cassa', (id) => {
        ordini = ordini.filter(o => o.id !== id);
        io.emit('aggiorna_cassa', ordini);
    });

    // La cucina completa l'ordine
    socket.on('ordine_pronto', (id) => {
        let ordine = ordini.find(o => o.id === id);
        if (ordine) {
            ordine.stato = 'Pronto';
            
            // Aggiorna i monitor di cassa e cucina
            io.emit('aggiorna_cassa', ordini);
            io.emit('aggiorna_cucina', ordini.filter(o => o.stato === 'In Cucina'));
            
            // Avvisa index.html che l'ordine è pronto, lasciandolo memorizzato per fare il conto
            io.emit('ordine_completato_cucina', { tavolo: ordine.tavolo, piatti: ordine.piatti });
        }
    });

    // Quando un monitor si connette, gli inviamo subito lo stato attuale degli ordini
    socket.emit('aggiorna_cassa', ordini);
    socket.emit('aggiorna_cucina', ordini.filter(o => o.stato === 'In Cucina'));
});

// ---------------------------------------------------------
// METTIAMO IL SERVER IN ASCOLTO
// ---------------------------------------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server attivo sulla porta ${PORT}`);
});
