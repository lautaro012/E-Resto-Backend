import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import router from './routes/index'
const bodyParser = require ('body-parser')




const app = express()
{/* 
app.use((req:any, res:any, next:any) => {
    res.header('Access-Control-Allow-Origin', '*'); // update to match the domain you will make the request from
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    next();
});
*/}
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(morgan('dev'));
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.use('/',router)

export default app