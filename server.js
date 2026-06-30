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

app.use(express.static('public')); // Cartella per i file HTML

// 3. Gestiamo le connessioni WebSocket
io.on('connection', (socket) => {
    console.log('Un dispositivo si è connesso');

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

    socket.on('approva_ordine', (id) => {
        let ordine = ordini.find(o => o.id === id);
        if (ordine) {
            ordine.stato = 'In Cucina';
            io.emit('aggiorna_cassa', ordini);
            io.emit('aggiorna_cucina', ordini.filter(o => o.stato === 'In Cucina'));
        }
    });

    socket.on('ordine_pronto', (id) => {
        let ordine = ordini.find(o => o.id === id);
        if (ordine) {
            ordine.stato = 'Pronto';
            io.emit('aggiorna_cassa', ordini);
            io.emit('aggiorna_cucina', ordini.filter(o => o.stato === 'In Cucina'));
        }
    });

    socket.emit('aggiorna_cassa', ordini);
    socket.emit('aggiorna_cucina', ordini.filter(o => o.stato === 'In Cucina'));
});

// 4. SOLO ALLA FINE mettiamo il server in ascolto
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server attivo sulla porta ${PORT}`);
});
