
const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool ({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

pool.connect();


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  const getUserWithEmailQuery = `
  SELECT * 
  FROM users
  WHERE email = $1;`

  return pool.query (getUserWithEmailQuery, [email])
  .then(res => {
    if (res.rows) {
      return res.rows[0];
    } else {
      return null;
    }
  })
  .catch(error => {
    console.log(error);
  });
}
exports.getUserWithEmail = getUserWithEmail;


/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  const getUserWithIdQuery = `
  SELECT *
  FROM users
  WHERE id = $1;`

  return pool.query(getUserWithIdQuery, [id])
  .then(res => {
    if (res.rows) {
      return res.rows[0];
    } else {
      return null;
    }
  })
  .catch(error => {
    console.log(error);
  });
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  const { name, email, password } = user;
  const addUserQuery = 
  `INSERT INTO users (name, email, password) 
  VALUES ($1, $2, $3)
  RETURNING *;`

  return pool.query(addUserQuery, [name, email, password])
  .then(res => res.rows)
  .catch(error => console.log(error));
}
exports.addUser = addUser;


/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const getAllReservationsQuery = `
  SELECT properties.id AS id, title, cost_per_night, start_date, avg(property_reviews.rating) AS average_rating
  FROM properties
  JOIN reservations ON properties.id = reservations.property_id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.end_date < now()::date 
  AND reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`

  return pool.query(getAllReservationsQuery, [guest_id, limit])
  .then(res => {
    return res.rows;
  })
  .catch(error => console.log(error));
}
exports.getAllReservations = getAllReservations;



/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  
  const queryParams = [];

  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  if (options.city || options.owner_id || options.minimum_price_per_night || options.maximum_price_per_night) {
    queryString += ` WHERE `;
    const optionsList = [];
    for (const option in options) {
      if (options[option]) {
        optionsList.push(option);
      }
    }

    for (let i = 0; i < optionsList.length - (options.minimum_rating ? 1 : 0); i++) {

      if (optionsList[i] === 'city') {
        queryParams.push(`%${options[optionsList[i]]}%`);
        queryString += ` city LIKE $${queryParams.length} `;
      }

      if (optionsList[i] === 'owner_id') {
        queryParams.push(`${options[optionsList[i]]}`);
        queryString += ` owner_id = $${queryParams.length} `;
      }

      if (optionsList[i] === 'minimum_price_per_night') {
        queryParams.push(`${options[optionsList[i]]}`);
        queryString += ` cost_per_night > $${queryParams.length} `;
      }

      if (optionsList[i] === 'maximum_price_per_night') {
        queryParams.push(`${options[optionsList[i]]}`);
        queryString += ` cost_per_night < $${queryParams.length} `;
      }

      if (i < optionsList.length - (options.minimum_rating ? 2 : 1)) {
        queryString += ` AND `;
      }
    }    
  }

  queryString += `
  GROUP BY properties.id
  `;

  if (options.minimum_rating) {
    queryParmas.push(` ${options.minimum_rating}`);
    queryString += ` HAVING avg(property_reviews.rating) > $${queryParams.length} `;
  }

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  return pool.query(queryString, queryParams)
  .then(res => res.rows);
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
}
exports.addProperty = addProperty;

