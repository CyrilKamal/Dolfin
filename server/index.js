require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const sql = require("mssql");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const { connectToDatabase, queryDatabase } = require("./db/db");
const { validateAccessToken } = require("./auth0.middleware");

const {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
} = require("plaid");

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET_SANDBOX,
    },
  },
});

const plaidClient = new PlaidApi(configuration);
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));
app.use(validateAccessToken);
app.use(bodyParser.json());
/**
 * @file The application root. Defines the Express server configuration.
 */

const socketIo = require('socket.io');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const { errorHandler } = require('./middleware');

const usersRouter = require('./routes/users'); // Ensure this path is correct
const sessionsRouter = require('./routes/sessions');
const itemsRouter = require('./routes/items');
const accountsRouter = require('./routes/accounts');
const institutionsRouter = require('./routes/institutions');
const serviceRouter = require('./routes/services');
const linkEventsRouter = require('./routes/linkEvents');
const linkTokensRouter = require('./routes/linkTokens');
const unhandledRouter = require('./routes/unhandled');
const assetsRouter = require('./routes/assets');

const { PORT } = process.env;
connectToDatabase();
const server = app.listen(8000, () => {
  console.log(`listening on port ${8000}`);
});
const io = socketIo(server);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// middleware to pass socket to each request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Set socket.io listeners.
io.on('connection', socket => {
  console.log('SOCKET CONNECTED');

  socket.on('disconnect', () => {
    console.log('SOCKET DISCONNECTED');
  });
});

app.get('/test', (req, res) => {
  res.send('test response');
});

app.use('/users', usersRouter); // Use usersRouter here
app.use('/sessions', sessionsRouter);
app.use('/items', itemsRouter);
app.use('/accounts', accountsRouter);
app.use('/institutions', institutionsRouter);
app.use('/services', serviceRouter);
app.use('/link-event', linkEventsRouter);
app.use('/link-token', linkTokensRouter);
app.use('/assets', assetsRouter);
app.use('*', unhandledRouter);

// Error handling has to sit at the bottom of the stack.
// https://github.com/expressjs/express/issues/2718
app.use(errorHandler);

const capitalizeAndRemoveUnderscores = (text) => {
  return text
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Signup route
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await queryDatabase(
      `INSERT INTO Users (name, email, password) VALUES (@name, @email, @password)`,
      [
        { name: 'name', type: sql.NVarChar, value: name },
        { name: 'email', type: sql.NVarChar, value: email },
        { name: 'password', type: sql.NVarChar, value: hashedPassword }
      ]
    );
    res.status(201).send("User created successfully");
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Error creating user");
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await queryDatabase(
      `SELECT * FROM Users WHERE email = @Email`,
      [{ name: 'Email', type: sql.NVarChar, value: email }]
    );
    const user = result.recordset[0];
    if (user && await bcrypt.compare(password, user.password)) {
      res.status(200).send({ message: "Login successful", userId: user.id });
    } else {
      res.status(401).send("Invalid email or password");
    }
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).send("Error logging in");
  }
});
app.post("/create_link_token", async function (request, response) {
  console.log(request.headers.authorization);
  try {
    const plaidRequest = {
      user: {
        client_user_id: "user",
      },
      client_name: 'Dolfin',
      products,
      country_codes: ['CA'],
      language: 'en',
      //webhook: httpsTunnel.public_url + '/services/webhook',
      access_token: accessToken,
      link_customization_name: 'dolfin',
      account_filters: {

        depository: {
    
          account_subtypes: ['checking', 'savings']
    
        },
    
        credit: {
    
          account_subtypes: ['credit card']
    
        }
      }
    };
    const createTokenResponse = await plaidClient.linkTokenCreate(plaidRequest);
    response.json(createTokenResponse.data);
  } catch (error) {
    console.error("Error creating link token:", error);
    response.status(500).send("failure");
  }
});

app.post("/exchange_public_token", async function (request, response) {
  const publicToken = request.body.public_token;
  try {
    const plaidResponse = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
    const accessToken = plaidResponse.data.access_token;
    response.json({ accessToken });
  } catch (error) {
    console.error("Error exchanging public token:", error);
    response.status(500).send("failed");
  }
});

app.post("/transactions/sync", async function (request, response) {
  const accessToken = request.body.access_token;
  try {
    const plaidResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: "2024-01-01",
      end_date: "2024-04-10", // Change this to appropriate date range
    });

    const transactions = plaidResponse.data.transactions;

    // Save transactions to the database
    for (const transaction of transactions) {
      const category = transaction.personal_finance_category
      const name = capitalizeAndRemoveUnderscores(transaction.name);
      const merchantName = capitalizeAndRemoveUnderscores(transaction.merchant_name || transaction.name);

      const accountIdResult = await queryDatabase(
        `SELECT id FROM Accounts WHERE account_id = @account_id`,
        [{ name: 'account_id', type: sql.NVarChar, value: transaction.account_id }]
      );

      const accountId = accountIdResult.recordset[0].id;

      console.log(accountId);

      await queryDatabase(
        `INSERT INTO Transactions (account_id, transaction_id, amount, date, name, merchant_name, category, logo_url) 
         VALUES (@account_id, @transaction_id, @amount, @date, @name, @merchant_name, @category, @logo_url)`,
        [
          { name: 'account_id', type: sql.Int, value: accountId },
          { name: 'transaction_id', type: sql.NVarChar, value: transaction.transaction_id },
          { name: 'amount', type: sql.Float, value: transaction.amount },
          { name: 'date', type: sql.Date, value: transaction.date },
          { name: 'name', type: sql.NVarChar, value: name },
          { name: 'merchant_name', type: sql.NVarChar, value: merchantName },
          { name: 'category', type: sql.NVarChar, value: category },
          { name: 'logo_url', type: sql.NVarChar, value: transaction.logo_url || '' }
        ]
      );
    }

    response.json(plaidResponse.data);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    response.status(500).send("failed");
  }
});

app.post("/user/data", async function (request, response) {
  const accessToken = request.body.access_token;
  try {
    const userInfoResponse = await plaidClient.identityGet({ access_token: accessToken });
    const userInfo = userInfoResponse.data;

    const userName = userInfo.accounts[0].owners[0].names[0];
    const userEmail = ""; // Add logic to fetch user email if available

    const userResult = await queryDatabase(
      `INSERT INTO Users (name, email) OUTPUT INSERTED.id VALUES (@name, @email)`,
      [
        { name: 'name', type: sql.NVarChar, value: userName },
        { name: 'email', type: sql.NVarChar, value: userEmail }
      ]
    );

    const userId = userResult.recordset[0].id;

    for (const account of userInfo.accounts) {
      await queryDatabase(
        `INSERT INTO Accounts (user_id, account_id, official_name, persistent_account_id) VALUES (@user_id, @account_id, @official_name, @persistent_account_id)`,
        [
          { name: 'user_id', type: sql.Int, value: userId },
          { name: 'account_id', type: sql.NVarChar, value: account.account_id },
          { name: 'official_name', type: sql.NVarChar, value: account.official_name },
          { name: 'persistent_account_id', type: sql.NVarChar, value: account.persistent_account_id }
        ]
      );
    }

    response.json(userInfo);
  } catch (error) {
    console.error("Error fetching user data:", error);
    response.status(500).send("failed");
  }
});

app.post("/user/identity", async function (request, response) {
  const accessToken = request.body.access_token;
  try {
    const userInfoResponse = await plaidClient.identityGet({ access_token: accessToken });
    const userInfo = userInfoResponse.data;
    response.json(userInfo);
  } catch (error) {
    console.error("Error fetching user data:", error);
    response.status(500).send("failed");
  }
});


