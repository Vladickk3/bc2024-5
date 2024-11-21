const { Command } = require('commander');
const express = require('express');
const fs = require('fs');
const path = require('path');

const program = new Command();


program
    .requiredOption('-h, --host <host>', 'Server host')
    .requiredOption('-p, --port <port>', 'Server port')
    .requiredOption('-c, --cache <cacheDir>', 'Cache directory path');

program.parse(process.argv);
const options = program.opts();


if (!fs.existsSync(options.cache)) {
    console.error(`Cache directory '${options.cache}' does not exist.`);
    process.exit(1);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 



app.get('/notes/:name', (req, res) => {
    const notePath = path.join(options.cache, req.params.name);
    if (!fs.existsSync(notePath)) {
        return res.status(404).send('Not found');
    }
    const note = fs.readFileSync(notePath, 'utf-8');
    res.send(note);
});

// Замінити текст нотатки
app.put('/notes/:name', (req, res) => {
    const notePath = path.join(options.cache, req.params.name);
    if (!fs.existsSync(notePath)) {
        return res.status(404).send('Not found');
    }
    fs.writeFileSync(notePath, req.body.text, 'utf-8');
    res.send('Note updated');
});

// Видалення нотатки
app.delete('/notes/:name', (req, res) => {
    const notePath = path.join(options.cache, req.params.name);
    if (!fs.existsSync(notePath)) {
        return res.status(404).send('Not found');
    }
    fs.unlinkSync(notePath);
    res.send('Note deleted');
});

// Отримання списку всіх нотаток
app.get('/notes', (req, res) => {
    const files = fs.readdirSync(options.cache);
    const notes = files.map(file => ({
        name: file,
        text: fs.readFileSync(path.join(options.cache, file), 'utf-8'),
    }));
    res.json(notes);
});

// Додавання нової нотатки
app.post('/write', async (req, res) => {
    const { note_name, note } = req.body;
    if (!note_name || !note) {
        return res.status(400).send('Missing required fields: note_name or note');
    }

    const filePath = path.join(options.cache, note_name);

    if (fs.existsSync(filePath)) {
        return res.status(400).send('Note already exists');
    }

    try {
        await fs.promises.writeFile(filePath, note);
        res.status(201).send('Note created');
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to save note');
    }
});

// Повернення HTML форми
app.get('/UploadForm.html', (req, res) => {
    const formHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>Upload Note</title></head>
    <body>
      <form action="/write" method="post">
        <label for="note_name">Note Name:</label>
        <input type="text" id="note_name" name="note_name" required><br>
        <label for="note">Note Text:</label>
        <textarea id="note" name="note" required></textarea><br>
        <button type="submit">Submit</button>
      </form>
    </body>
    </html>
  `;
    res.send(formHtml);
});

// Запуск сервера
app.listen(options.port, options.host, () => {
    console.log(`Server is running on http://${options.host}:${options.port}`);
});
