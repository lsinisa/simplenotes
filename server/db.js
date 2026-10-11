'use strict';

const { DatabaseSync } = require('node:sqlite');

class Db {
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.init();
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS userAuth (
        id integer PRIMARY KEY,
        name text,
        email text UNIQUE,
        password text,
        created_at text
      )`);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id integer PRIMARY KEY,
        user_id integer,
        title text,
        message text,
        created_at text
      )`);
    this.db.exec('CREATE INDEX IF NOT EXISTS notes_by_user ON notes (user_id)');

    // Statements are prepared once and reused for every request. Node 26's
    // sqlite binding only accepts named parameters bound from an object, so
    // every placeholder here is named.
    this.stmt = {
      byEmail: this.db.prepare('SELECT * FROM userAuth WHERE email = :email'),
      byId: this.db.prepare('SELECT * FROM userAuth WHERE id = :id'),
      insertUser: this.db.prepare(
        'INSERT INTO userAuth (name,email,password,created_at) VALUES (:name,:email,:password,:created_at)'
      ),
      listNotes: this.db.prepare('SELECT * FROM notes WHERE user_id = :user_id ORDER BY id DESC'),
      insertNote: this.db.prepare(
        'INSERT INTO notes (user_id,title,message,created_at) VALUES (:user_id,:title,:message,:created_at)'
      ),
      deleteNote: this.db.prepare('DELETE FROM notes WHERE user_id = :user_id AND id = :id'),
      countNotes: this.db.prepare('SELECT id FROM notes WHERE user_id = :user_id'),
    };
  }

  selectByEmail(email) {
    return this.stmt.byEmail.get({ email });
  }

  selectUserById(id) {
    return this.stmt.byId.get({ id });
  }

  insert(name, email, password, createdAt) {
    this.stmt.insertUser.run({ name, email, password, created_at: createdAt });
    return this.selectByEmail(email);
  }

  selectNotes(userId) {
    return this.stmt.listNotes.all({ user_id: userId });
  }

  countNotes(userId) {
    return this.stmt.countNotes.all({ user_id: userId }).length;
  }

  insertNote(userId, title, message, createdAt) {
    this.stmt.insertNote.run({ user_id: userId, title, message, created_at: createdAt });
  }

  deleteNote(userId, id) {
    this.stmt.deleteNote.run({ user_id: userId, id });
  }

  close() {
    this.db.close();
  }
}

module.exports = Db;
