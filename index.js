const express = require( 'express' )
const app = express()
const cors = require( 'cors' )
const mysql = require( 'mysql' )
const port = 8080

const bodyParser = require( 'body-parser' )
app.use( bodyParser.urlencoded( { extended: true } ) )
app.use( bodyParser.json() )

const conn = mysql.createConnection( {
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'kakao'
} )

conn.connect( ( err ) => {
  if( err ) throw err
  console.log( 'mysql connect' )

  conn.query( 'CREATE DATABASE IF NOT EXISTS kakao', ( err, result ) => {
    if( err ) throw err
  } )

  const sql = `CREATE TABLE IF NOT EXISTS user (
    userId INT NOT NULL AUTO_INCREMENT,
    userName VARCHAR(45) NOT NULL,
    password VARCHAR(45) NOT NULL,
    PRIMARY KEY (userId),
    UNIQUE INDEX userId_UNIQUE (userId ASC),
    UNIQUE INDEX userName_UNIQUE (userName ASC))`

    conn.query( sql, ( err, result ) => {
      if( err ) throw err
    } )
} )

app.use(cors({
  origin: '*'
}))


app.get( '/', ( req, res ) => {
  res.send( 'connect success' )
} )

app.post( '/registeruser', async ( req, res ) => {

  console.log( req.body )
  res.send( {
    code: 200,
    payload: {
      asd: 1
    }
  } )

  let event = {
    // header : req.headers,
    query : req.query,
    asd: req.data,
    body : req.body,
    query2 : res.query,
    body2 : res.body,
    query3 : res.params,
    body3 : res.params,
    query4 : req.params,
    body5 : req.params,
  }
} )

const server = app.listen( port, () => {
  const host = server.address().address
  const port = server.address().port

  console.log( 'Server is working : PORT - ', port )
} )