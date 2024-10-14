import bodyParser from "body-parser";
import express from "express";
import pg from "pg";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5353;
const uri = process.env.URI;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "school",
    password: "Ayomikun@18",
    port: 5432,
})

mongoose.connect(uri)
.then(() => {
    console.log("MongoDb database connected");
})
.catch((error) => {
    console.log(`MongoDb connection error: ${error}`);
})

const mySchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    picture: { type: String, required: false },
    password: { type: String, required: true},
})

const MyModel = mongoose.model("TVC", mySchema);

db.connect();

app.use(express.json());

app.use(bodyParser.urlencoded( {extended: true} ));

app.get("/", async (req, res) => {
    try {
        const all = await MyModel.find();
        res.json(all);
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


app.post("/register", async (req, res) => {
    try{
        const {
            username: username,
            password: password,
            confirmPassword: confirmPassword,
            email: email,
        } = req.body;

        // const ifExist = await db.query("SELECT email FROM tvc_database WHERE email = $1", 
        //     [email],
        // )

        const ifExist = await MyModel.findOne({ email: email });
        console.log(ifExist)
        if(ifExist.rows.length > 0){
            res.send({
                error: "Email already exist",
                email: ifExist.rows[0].email,
            });
        }
        else if(password.length < 6){
            res.json({error: "Your password length has to be 6 or more"});
        }
        else if(confirmPassword != password){
            res.json({error: "Your password needs to match"});
        } 
        else if(ifExist.rows.length == 0){
            const saltRounds = 10;
            const hashPassword = await bcrypt.hash(password, saltRounds);
            console.log(hashPassword)
            const response = await db.query("INSERT INTO tvc_database (username, email, password) VALUES ($1, $2, $3) RETURNING *", 
                [username, email, hashPassword],
            )
            console.log(response);
            res.json(response.rows);
        }
    }
    catch(error){
        res.json({error: error.message});
    } 
})

app.post("/login", async (req, res) => {
    try{
        const {
            password: password,
            username: email,
        } = req.body;
        // "chrome://net-internals/#hsts"
        
        const response = await db.query("SELECT * FROM tvc_database WHERE email = $1",
            [email],
        )
        console.log(response.rows);

        if(response.rows.length == 0){
            res.json({error: "User not found"});
        } 
        else if(response.rows.length > 0){
            const {
                password: storedHashedPassword,
            } = response.rows[0];
            const user = response.rows[0];
            const checkPassword = await bcrypt.compare(password, storedHashedPassword);
            console.log(checkPassword);
            if(!checkPassword){
                res.json({error: "Incorrect Password"});
            }
            else if(checkPassword){
                res.json(user);
            }          
        } 
    }
    catch(error){
        res.json(error.message);
    }
})

app.listen(port, "0.0.0.0", () => {
    console.log(`API started runing on port ${port}.`);
})