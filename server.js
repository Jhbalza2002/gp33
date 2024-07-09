const express = require('express');
const pg = require('pg');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 3000;
const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:yourpassword@localhost/acme_notes_categories_db';
const client = new pg.Client({ connectionString: databaseUrl });

app.use(express.json());
app.use(morgan('dev'));

app.get('/api/categories', async (req, res, next) => {
  try {
    const SQL = `SELECT * FROM categories`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/notes', async (req, res, next) => {
  try {
    const SQL = `SELECT * FROM notes ORDER BY created_at DESC`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/notes', async (req, res, next) => {
  try {
    const { txt, category_id } = req.body;
    const SQL = `
      INSERT INTO notes(txt, category_id)
      VALUES($1, $2)
      RETURNING *
    `;
    const response = await client.query(SQL, [txt, category_id]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.put('/api/notes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { txt, ranking, category_id } = req.body;
    const SQL = `
      UPDATE notes
      SET txt=$1, ranking=$2, category_id=$3, updated_at=now()
      WHERE id=$4
      RETURNING *
    `;
    const response = await client.query(SQL, [txt, ranking, category_id, id]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/notes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const SQL = `DELETE FROM notes WHERE id=$1`;
    await client.query(SQL, [id]);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

const init = async () => {
  try {
    await client.connect();

    let SQL = `
      DROP TABLE IF EXISTS notes;
      DROP TABLE IF EXISTS categories;
      CREATE TABLE categories(
        id SERIAL PRIMARY KEY,
        name VARCHAR(100)
      );
      CREATE TABLE notes(
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        ranking INTEGER DEFAULT 3 NOT NULL,
        txt VARCHAR(255) NOT NULL,
        category_id INTEGER REFERENCES categories(id) NOT NULL
      );
    `;
    await client.query(SQL);

    console.log('Tables created');

    SQL = `
      INSERT INTO categories(name) VALUES('SQL');
      INSERT INTO categories(name) VALUES('Express');
      INSERT INTO categories(name) VALUES('Shopping');
      INSERT INTO notes(txt, ranking, category_id) VALUES('learn express', 5, (SELECT id FROM categories WHERE name='Express'));
      INSERT INTO notes(txt, ranking, category_id) VALUES('add logging middleware', 5, (SELECT id FROM categories WHERE name='Express'));
      INSERT INTO notes(txt, ranking, category_id) VALUES('write SQL queries', 4, (SELECT id FROM categories WHERE name='SQL'));
      INSERT INTO notes(txt, ranking, category_id) VALUES('learn about foreign keys', 4, (SELECT id FROM categories WHERE name='SQL'));
      INSERT INTO notes(txt, ranking, category_id) VALUES('buy a quart of milk', 2, (SELECT id FROM categories WHERE name='Shopping'));
    `;
    await client.query(SQL);

    console.log('Data seeded');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

init().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on ${port}`);
  });
}).catch(err => console.error('Error starting server:', err));
