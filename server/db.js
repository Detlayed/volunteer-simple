const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbFile = process.env.SQLITE_FILE || path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbFile);

function run(sql, params=[]){
  return new Promise((resolve, reject)=>{
    db.run(sql, params, function(err){ if(err) return reject(err); resolve(this); });
  });
}
function get(sql, params=[]){
  return new Promise((resolve, reject)=>{ db.get(sql, params, (err,row)=> err?reject(err):resolve(row)); });
}
function all(sql, params=[]){
  return new Promise((resolve, reject)=>{ db.all(sql, params, (err,rows)=> err?reject(err):resolve(rows)); });
}

// Initialize tables
(async ()=>{
  await run("create table if not exists users (id text primary key, email text unique not null, password_hash text not null, full_name text, iin text, phone text, city text, created_at text default (datetime('now')))");
  await run("create table if not exists requests (id text primary key, name text not null, city text, address text, contact text, descr text, coords text, status text default 'new', created text default (datetime('now')))");
})();

const { v4: uuidv4 } = require('uuid');

module.exports = {
  getUserByEmail: async (email)=> get('select * from users where email = ?', [email]),
  createUser: async ({ email, password_hash, full_name, iin, phone, city })=>{
    const id = uuidv4();
    await run('insert into users(id,email,password_hash,full_name,iin,phone,city) values(?,?,?,?,?,?,?)', [id,email,password_hash,full_name, iin, phone, city]);
    return { id, email, full_name, phone, city };
  },
  createRequest: async ({ name, city, address, contact, descr, coords, status, created })=>{
    const id = uuidv4();
    await run('insert into requests(id,name,city,address,contact,descr,coords,status,created) values(?,?,?,?,?,?,?,?,?)', [id,name,city,address,contact,descr,coords,status,created]);
    return { id };
  },
  listRequests: async ()=> all('select * from requests order by created desc'),
  updateRequestStatus: async (id,status)=>{
    await run('update requests set status = ? where id = ?', [status, id]);
    return { id, status };
  }
};
