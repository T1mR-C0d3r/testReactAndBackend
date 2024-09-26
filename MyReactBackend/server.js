const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',  // Кэшировать на 1 день
  etag: true
}));


// Настройка хранилища для multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});


const upload = multer({ storage });

// Настройка соединения с базой данных
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'images'
});

db.connect((err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err);
    return;
  }
  console.log('Соединение с базой данных установлено.');
});

// Маршрут для загрузки файла
app.post('/api/images/upload', upload.single('image'), (req, res) => {
  console.log('Тело запроса:', req.body);
  console.log('Загруженный файл:', req.file);

  if (!req.file) {
    console.error('Файл не загружен');
    return res.status(400).json({ error: 'Файл не загружен' });
  }

  const { title, description } = req.body;
  if (!title || !description) {
    console.error('Название или описание не предоставлены');
    return res.status(400).json({ error: 'Название и описание должны быть предоставлены' });
  }

  const imagePath = `/uploads/${req.file.filename}`;
  const fullImagePath = `http://localhost:5000${imagePath}`; // Полный URL

  const query = 'INSERT INTO images (title, description, path) VALUES (?, ?, ?)';
  db.query(query, [title, description, fullImagePath], (err, results) => {
    if (err) {
      console.error('Ошибка при выполнении запроса:', err);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
    res.json({ id: results.insertId, title, description, path: fullImagePath });
  });
});



app.post('/api/images/url', (req, res) => {
  const { title, description, path } = req.body;

  if (!title || !description || !path) {
      return res.status(400).json({ error: 'Все поля должны быть заполнены' });
  }

  const query = 'INSERT INTO images (title, description, path) VALUES (?, ?, ?)';

  db.query(query, [title, description, path], (err, results) => {
      if (err) {
          console.error('Ошибка выполнения запроса:', err);
          return res.status(500).json({ error: 'Ошибка сервера' });
      }

      res.json({ id: results.insertId, title, description, path });
  });
});

app.get('/api/images', (req, res) => {
  const query = 'SELECT * FROM images';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Ошибка выполнения запроса:', err);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
    res.json(results);
  });
});

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});



const fs = require('fs');

// Маршрут для получения списка файлов в папке uploads
app.get('/api/uploads', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');

  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error('Ошибка чтения папки uploads:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
      return;
    }

    // Формируем полный путь к файлам
    const filePaths = files.map(file => `/uploads/${file}`);
    res.json(filePaths);
  });
});