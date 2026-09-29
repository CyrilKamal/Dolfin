const { connectToDatabase, queryDatabase } = require("../db");
const sql = require("mssql");

/**
 * Creates a single user.
 *
 * @param {string} username the username of the user.
 * @param {string} auth0Id the Auth0 ID of the user.
 * @returns {Object} the new user.
 */
const createUser = async (username, auth0Id) => {
  const query = `
    INSERT INTO users_table (username, auth0_id)
    OUTPUT INSERTED.*
    VALUES (@param1, @param2);
  `;
  const params = [
    { name: "param1", type: sql.NVarChar, value: username },
    { name: "param2", type: sql.NVarChar, value: auth0Id },
  ];
  const { recordset } = await queryDatabase(query, params);
  return recordset[0];
};

/**
 * Removes users and related items, accounts and transactions.
 *
 * @param {string} userId the ID of the user to be deleted.
 */
const deleteUsers = async (userId) => {
  const query = `
    DELETE FROM users_table WHERE id = @param1;
  `;
  const params = [{ name: "param1", type: sql.Int, value: userId }];
  await queryDatabase(query, params);
};

/**
 * Retrieves a single user.
 *
 * @param {string} auth0Id the Auth0 ID of the user.
 * @returns {Object} a user.
 */
const retrieveUserByAuth0Id = async auth0Id => {
  const query = `
    SELECT * FROM users_table WHERE auth0_id = @param1;
  `;
  const params = [{ name: 'param1', type: sql.NVarChar, value: auth0Id }];
  const { recordset } = await queryDatabase(query, params);
  return recordset[0];
};

/**
 * Retrieves a single user.
 *
 * @param {string} auth0Id the Auth0 ID of the user.
 * @returns {Object} a single user.
 */
const retrieveUserByUsername = async (auth0Id) => {
  const query = `
    SELECT * FROM users_table WHERE auth0_id = @param1;
  `;
  const params = [{ name: "param1", type: sql.NVarChar, value: auth0Id }];
  const { recordset: users } = await queryDatabase(query, params);
  return users[0];
};

/**
 * Retrieves all users.
 *
 * @returns {Object[]} an array of users.
 */
const retrieveUsers = async () => {
  const query = `
    SELECT * FROM users_table;
  `;
  const { recordset: users } = await queryDatabase(query);
  return users;
};

// For transaction assets
const retrieveTransactionAssetsByUserId = async (userId) => {
  const query = `
    SELECT t.id, t.account_id, t.category, t.amount, t.date, t.created_at, a.type
    FROM [DolfinDB].[dbo].[transactions_table] t
    JOIN [DolfinDB].[dbo].[accounts_table] a ON t.account_id = a.id
    JOIN [DolfinDB].[dbo].[items_table] i ON a.item_id = i.id
    WHERE i.user_id = @param1
      AND a.type IN ('depository', 'investment')
    ORDER BY t.date DESC, t.created_at DESC;
  `;
  const params = [{ name: "param1", type: sql.Int, value: userId }];
  const { recordset: transactions } = await queryDatabase(query, params);
  return transactions;
};

// For transaction liabilities
const retrieveTransactionLiabilitiesByUserId = async (userId) => {
  const query = `
    SELECT t.id, t.account_id, t.category, t.amount, t.date, t.created_at, a.type
    FROM transactions_table t
    JOIN accounts_table a ON t.account_id = a.id
    JOIN items_table i ON a.item_id = i.id
    WHERE i.user_id = @param1
      AND a.type IN ('loan', 'credit')
    ORDER BY t.date DESC, t.created_at DESC;
  `;
  const params = [{ name: "param1", type: sql.Int, value: userId }];
  const { recordset: transactions } = await queryDatabase(query, params);
  return transactions;
};

/**
 * Creates a new income and bills entry for a user.
 *
 * @param {number} userId the ID of the user.
 * @param {number} income the income amount.
 * @param {number} bills the bills amount.
 * @returns {Object} the new income and bills entry.
 */
const createIncomeBills = async (userId, income, bills) => {
  console.log('Creating income and bills entry:', { userId, income, bills });
  const query = `
    INSERT INTO income_bills_table (user_id, income, bills)
    OUTPUT INSERTED.*
    VALUES (@userId, @income, @bills);
  `;
  const params = [
    { name: "userId", type: sql.Int, value: userId },
    { name: "income", type: sql.Decimal(10, 2), value: income },
    { name: "bills", type: sql.Decimal(10, 2), value: bills },
  ];

  try {
    const { recordset } = await queryDatabase(query, params);
    console.log('Income and bills entry created:', recordset[0]);
    return recordset[0];
  } catch (error) {
    console.error('Error creating income and bills entry:', error);
    throw error;
  }
};

/**
 * Updates the income and bills entry for a user.
 *
 * @param {number} userId the ID of the user.
 * @param {number} income the new income amount.
 * @param {number} bills the new bills amount.
 * @returns {Object} the updated income and bills entry.
 */
const updateIncomeBills = async (userId, income, bills) => {
  console.log('Updating income and bills entry:', { userId, income, bills });
  const query = `
    UPDATE income_bills_table
    SET income = @income, bills = @bills
    WHERE user_id = @userId;
  `;
  const params = [
    { name: "userId", type: sql.Int, value: userId },
    { name: "income", type: sql.Decimal(10, 2), value: income },
    { name: "bills", type: sql.Decimal(10, 2), value: bills },
  ];

  try {
    await queryDatabase(query, params);
    const updatedEntry = await retrieveIncomeBillsByUserId(userId); // Fetch the updated entry
    console.log('Income and bills entry updated:', updatedEntry);
    return updatedEntry;
  } catch (error) {
    console.error('Error updating income and bills entry:', error);
    throw error;
  }
};

/**
 * Retrieves income and bills for a user.
 *
 * @param {number} userId the ID of the user.
 * @returns {Object} the income and bills entry.
 */
const retrieveIncomeBillsByUserId = async (userId) => {
  console.log('Retrieving income and bills for user:', { userId });
  const query = `
    SELECT * FROM income_bills_table WHERE user_id = @userId;
  `;
  const params = [{ name: "userId", type: sql.Int, value: userId }];

  try {
    const { recordset } = await queryDatabase(query, params);
    console.log('Income and bills retrieved:', recordset[0]);
    return recordset[0];
  } catch (error) {
    console.error('Error retrieving income and bills:', error);
    throw error;
  }
};

// Create a new budget category entry for a user
const createBudgetCategory = async (userId, category, budgetedValue, actualValue) => {
  const query = `
    INSERT INTO budget_table (user_id, category, budgeted_value, actual_value)
    OUTPUT INSERTED.*
    VALUES (@userId, @category, @budgetedValue, @actualValue);
  `;
  const params = [
    { name: "userId", type: sql.Int, value: userId },
    { name: "category", type: sql.NVarChar, value: category },
    { name: "budgetedValue", type: sql.Decimal(10, 2), value: budgetedValue },
    { name: "actualValue", type: sql.Decimal(10, 2), value: actualValue },
  ];

  console.log(`Executing query to create budget category for user ${userId}`);

  try {
    const { recordset } = await queryDatabase(query, params);
    return recordset[0];
  } catch (error) {
    console.error(`Error executing query to create budget category for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Updates a budget category for a user.
 *
 * @param {number} userId the ID of the user.
 * @param {string} category the budget category.
 * @param {number} budgetedValue the budgeted amount.
 * @param {number} actualValue the actual amount spent.
 * @returns {Object} the updated budget category entry.
 */
const updateBudgetCategory = async (userId, category, budgetedValue, actualValue) => {
  const queryUpdate = `
    UPDATE budget_table
    SET budgeted_value = @budgetedValue, actual_value = @actualValue
    WHERE user_id = @userId AND category = @category;
  `;
  
  const paramsUpdate = [
    { name: "userId", type: sql.Int, value: userId },
    { name: "category", type: sql.NVarChar, value: category },
    { name: "budgetedValue", type: sql.Decimal(10, 2), value: budgetedValue },
    { name: "actualValue", type: sql.Decimal(10, 2), value: actualValue },
  ];

  const querySelect = `
    SELECT * FROM budget_table
    WHERE user_id = @userId AND category = @category;
  `;
  
  const paramsSelect = [
    { name: "userId", type: sql.Int, value: userId },
    { name: "category", type: sql.NVarChar, value: category }
  ];

  console.log(`Executing query to update budget category for user ${userId}`);

  try {
    await queryDatabase(queryUpdate, paramsUpdate);
    const { recordset } = await queryDatabase(querySelect, paramsSelect);
    return recordset[0];
  } catch (error) {
    console.error(`Error executing query to update budget category for user ${userId}:`, error);
    throw error;
  }
};


// Retrieve budget categories for a user
const retrieveBudgetCategoriesByUserId = async (userId) => {
  const query = `
    SELECT * FROM budget_table WHERE user_id = @userId;
  `;
  const params = [{ name: "userId", type: sql.Int, value: userId }];
  
  console.log(`Executing query to retrieve budget categories for user ${userId}`);

  try {
    const { recordset } = await queryDatabase(query, params);
    return recordset;
  } catch (error) {
    console.error(`Error executing query to retrieve budget categories for user ${userId}:`, error);
    throw error;
  }
};

module.exports = {
  createUser,
  deleteUsers,
  retrieveUserByAuth0Id,
  retrieveUserByUsername,
  retrieveUsers,
  retrieveTransactionAssetsByUserId,
  retrieveTransactionLiabilitiesByUserId,
  createIncomeBills,
  updateIncomeBills,
  retrieveIncomeBillsByUserId,
  createBudgetCategory,
  updateBudgetCategory,
  retrieveBudgetCategoriesByUserId,
  updateIncomeBills,
};
