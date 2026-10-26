# Briscola a chiamata

Web app per giocare a **briscola a chiamata** (briscola in cinque): tu contro quattro bot, secondo il
regolamento in [`briscola_a_chiamata.md`](briscola_a_chiamata.md). Funziona nel browser, anche da
telefono, senza installare niente e senza server.

## Come si gioca

1. Scegli il nome, il numero di mani (5, 10, 15 o 20), la forza dei bot, la velocità e gli aiuti.
2. **Asta**: quando tocca a te chiami un valore (Asso, Tre, Re, …) o passi. Ogni chiamata deve essere
   più bassa della precedente. Dopo il Due si rilancia sui punti (“Due a 62”, “Due a 70”…, fino a 120).
3. Se vinci l'asta scegli il **seme di briscola**: la carta chiamata è il valore detto in asta di quel
   seme. Se ce l'hai tu, giochi da solo contro tutti.
4. **Gioco**: tocca una carta per giocarla. Non c'è obbligo di rispondere al seme. Dopo ogni presa
   le carte restano visibili per un attimo (tocca il tavolo per andare avanti); con il pulsante
   **Ultima presa** puoi rivedere l'ultima presa raccolta, come previsto dal regolamento.
5. A fine mano compare il riepilogo con i punti di classifica; a fine partita la classifica finale.

La partita in corso viene salvata nel browser: se ricarichi la pagina puoi riprenderla dal menu.

### Storico e analisi delle partite

Ogni partita, anche in corso, viene registrata nello **Storico partite** (dal menu iniziale, o con
**Analizza la partita** a fine partita). Per ogni partita si vedono le mani con chiamata, compagno,
punti, esito e classifica progressiva; ogni mano si può ripercorrere passo passo:

- le mani iniziali di tutti e cinque i giocatori, con le carte già giocate attenuate;
- l'asta intervento per intervento e la scelta della briscola;
- le prese giocata per giocata, con chi esce, chi prende e i punti;
- il **ragionamento dei bot**: per ogni chiamata il valore atteso delle chiamate possibili, per la
  briscola il valore di ogni seme e, per ogni carta giocata (livello Massimo), il valore stimato di
  tutte le carte che il bot aveva in mano.

Lo storico è salvato in **IndexedDB**, il database integrato nel browser: resta sul dispositivo, non
viene inviato a nessun server e si perde cancellando i dati del sito. Le mani annullate perché tutti
hanno passato compaiono nello storico ma non contano nel punteggio.

### Aiuti facoltativi

- **Carte uscite**: tabella delle carte già giocate, per seme.
- **Punti in tempo reale**: punti fatti da ciascun giocatore e, appena le squadre ti sono note,
  dalle due squadre.

Si attivano all'inizio o durante la partita.

## Regole implementate

Tutte quelle del regolamento: 40 carte, 8 a testa, gioco in senso antiorario, asta al ribasso con
eliminazione di chi passa, asta sui punti dopo il Due, carta chiamata e compagno segreto, possibilità
di chiamarsi da solo, nessun obbligo di risposta, vittoria con almeno 61 punti (o l'obiettivo d'asta),
60 a 60 perso per il chiamante, cappotto con punteggio raddoppiato, punteggi +2/+1/−1 in coppia e
+4/−1 da solo.

Punti non specificati dal regolamento e scelte fatte:

- Il primo mazziere è estratto a caso; il taglio del mazzo è solo simbolico.
- Se tutti passano la mano viene rifatta con il mazziere successivo e **non conta** nel numero di
  mani della partita.
- Nell'asta sui punti si può offrire qualsiasi numero intero più alto dell'offerta precedente, fino a
  120. Rilanciare cambia solo l'obiettivo, non i punti di classifica.
- Chi ha già chiamato può richiamare più in basso quando torna il suo turno (come Carla nell'esempio
  del regolamento).
- A parità di punteggio finale si dichiara la **vittoria a pari merito**.

## I bot

I bot non barano: ricevono solo ciò che un giocatore può sapere (la propria mano, le carte giocate,
l'asta, la carta chiamata) e devono dedurre il resto.

- **Asta e briscola**: per ogni combinazione valore/seme simulano molte mani con le carte degli altri
  distribuite a caso e stimano il guadagno atteso in punti di classifica; chiamano finché conviene.
- **Gioco (livello Massimo)**: ricerca Monte Carlo con determinizzazione. A ogni turno il bot genera
  centinaia di distribuzioni plausibili delle carte nascoste, pesate in base a ciò che ha osservato
  (chi carica le prese del chiamante è probabilmente il compagno; il chiamante ha di solito molte
  briscole), prova ogni carta in mano e simula il resto della mano; gioca la carta con il miglior
  risultato medio. I calcoli avvengono in un Web Worker, così l'interfaccia resta fluida.
- **Livello Base**: solo la politica euristica (più rapida, meno forte).

I parametri sono stati tarati con tornei "duplicati" (stesse carte, posti a rotazione): il livello
Massimo guadagna in media circa mezzo punto di classifica a mano rispetto al livello Base.

## Sviluppo

Serve Node.js 20 o successivo.

```bash
npm install
npm run dev        # server di sviluppo
npm test           # test (motore di gioco e IA)
npm run build      # build di produzione in dist/
```

Strumenti per i bot (in `scripts/`):

```bash
# torneo "duplicato" tra due configurazioni: npx vite-node scripts/tournament.ts -- <A> <B> <mani>
npx vite-node scripts/tournament.ts -- forte base 40
# statistiche su mani giocate dai bot
npx vite-node scripts/stats.ts -- base 100
```

Struttura del codice:

- `src/engine/`: regole del gioco, pure e testate (carte, asta, presa, mano, punteggio, partita).
- `src/ai/`: bot (simulatore veloce, euristica, campionamento dei mondi, ricerca, asta, Web Worker).
- `src/history/`: record delle partite per lo storico e salvataggio in IndexedDB.
- `src/ui/`: interfaccia React.

## Pubblicazione

Il workflow `.github/workflows/deploy.yml` pubblica il gioco su GitHub Pages a ogni push su `main`.
Va attivato una volta in **Settings → Pages → Build and deployment → Source: GitHub Actions**.
