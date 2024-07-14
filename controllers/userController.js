const paypal = require("paypal-rest-sdk");
const jwt = require("jsonwebtoken");
const dbPool = require("../config/db");
const asyncHandler = require("express-async-handler");
var SibApiV3Sdk = require("sib-api-v3-sdk");
var defaultClient = SibApiV3Sdk.ApiClient.instance;
var apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.SENDINBLUE_API_KEY;
// Send Email function
const generateRandomPassword = () => {
  const length = 8; // Length of the generated password
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // Characters to include in the password
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};
const sendEmail = async (toEmail, userId, token) => {
  try {
    const password = generateRandomPassword();
    const sendSmtpEmail = {
      sender: { email: "smohanakrishnan82@gmail.com", name: "MohaN" },
      to: [{ email: toEmail }],
      subject: "Welcome to Our Carolina Tamil Sangam !",
      htmlContent: `<html><body>
        <p>Dear User,</p>
        <p>Welcome to Carolina Tamil Sangam Membership Your credentials!!! <br> login password is: <strong>${password}</strong></p>
        <a href="">link</a>
        <p>Enjoy using our services!</p>
      </body></html>`,
    };

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.apiKey = apiKey;
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    const pool = await dbPool.connect();

    const insertLoginQuery = {
      text: `INSERT INTO login (user_id, email, password,jwt_token)
                 VALUES ($1, $2, md5($3),$4)`,
      values: [userId, toEmail, password, token],
    };
    await pool.query(insertLoginQuery);

    // Release the connection pool
    pool.release();
    console.log("Email sent successfully:", response);
    return response;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

//

paypal.configure({
  mode: "sandbox",
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

//
const getAll = asyncHandler(async (req, res) => {
  res.status(200).json({ message: "Get all user End Point of User" });
});
//

// Handle PayPal payment success
const success = asyncHandler(async (req, res) => {
  const { paymentId, PayerID, userId } = req.query;

  try {
    const pool = await dbPool.connect();

    const execute_payment_json = {
      payer_id: PayerID,
    };

    paypal.payment.execute(
      paymentId,
      execute_payment_json,
      async (error, payment) => {
        if (error) {
          console.error("Error executing PayPal payment:", error);
          return res.status(500).json({ error: "Payment execution error" });
        } else {
          const updatePaymentQuery = {
            text: `UPDATE users SET payment_status = $1, payment_id = $2, payment_at = $3 WHERE id = $4`,
            values: ["Completed", paymentId, new Date(), userId],
          };
          await pool.query(updatePaymentQuery);

          const getTokenQuery = {
            text: `SELECT jwt_token FROM payments WHERE user_id = $1`,
            values: [userId],
          };
          const tokenResult = await pool.query(getTokenQuery);
          const jwtToken = tokenResult.rows[0].jwt_token;

          pool.release();
          res.redirect("http://127.0.0.1:5500/");
        }
      }
    );
  } catch (err) {
    console.error("Error handling payment success:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

//
const signUp = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, membershipType, price } = req.body;

  try {
    const pool = await dbPool.connect();

    const userCheckQuery = {
      text: "SELECT * FROM users WHERE email = $1",
      values: [email],
    };
    const userCheckResult = await pool.query(userCheckQuery);

    if (userCheckResult.rows.length > 0) {
      pool.release();
      return res.status(400).json({ error: "Email already exists" });
    }

    const insertUserQuery = {
      text: `INSERT INTO users (first_name, last_name, email, phone, membership_type, payment_status,payment_at)
             VALUES ($1, $2, $3, $4, $5, $6,$7) RETURNING id`,
      values: [
        firstName,
        lastName,
        email,
        phone,
        membershipType,
        "Pending",
        new Date(),
      ],
    };
    const insertUserResult = await pool.query(insertUserQuery);
    const userId = insertUserResult.rows[0].id;

    const token = jwt.sign({ userId, email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: `/api/users/success?userId=${userId}`,
        cancel_url: "/api/users/cancel",
      },
      transactions: [
        {
          item_list: {
            items: [
              {
                name: "Membership",
                sku: "001",
                price: price,
                currency: "USD",
                quantity: 1,
              },
            ],
          },
          amount: {
            currency: "USD",
            total: price,
          },
          description: "Membership Payment",
        },
      ],
    };

    paypal.payment.create(create_payment_json, async (error, payment) => {
      if (error) {
        console.error("Error creating PayPal payment:", error);
        pool.release();
        return res.status(500).json({ error: "Payment error" });
      } else {
        const approvalUrl = payment.links.find(
          (link) => link.rel === "approval_url"
        ).href;

        const insertPaymentQuery = {
          text: `INSERT INTO payments (user_id, paypal_payment_link, jwt_token)
                 VALUES ($1, $2, $3)`,
          values: [userId, approvalUrl, token],
        };
        await pool.query(insertPaymentQuery);

        // Send email to user for password setup
        await sendEmail(email, userId, token);
        // Send PayPal approval_url to client
        res.json({ forwardLink: approvalUrl, Token: token });
      }
    });
  } catch (err) {
    console.error("Error in signup:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  try {
    const pool = await dbPool.connect();

    const getTokenQuery = {
      text: `SELECT user_id, jwt_token FROM login WHERE email = $1`,
      values: [email],
    };
    const tokenResult = await pool.query(getTokenQuery);
    let token =
      tokenResult.rows.length > 0 ? tokenResult.rows[0].jwt_token : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Existing token is valid:", decoded);

        const currentTimestamp = Math.floor(Date.now() / 1000);
        if (decoded.exp < currentTimestamp) {
          token = jwt.sign(
            { userId: decoded.userId, email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
          );

          const updateTokenQuery = {
            text: `UPDATE login SET jwt_token = $1 WHERE email = $2`,
            values: [token, email],
          };
          await pool.query(updateTokenQuery);
        }
      } catch (err) {
        console.error("Existing token verification error:", err);
        token = jwt.sign(
          { userId: tokenResult.rows[0].user_id, email },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        const updateTokenQuery = {
          text: `UPDATE login SET jwt_token = $1 WHERE email = $2`,
          values: [token, email],
        };
        await pool.query(updateTokenQuery);
      }
    } else {
      token = jwt.sign(
        { userId: user.user_id, email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      const insertTokenQuery = {
        text: `INSERT INTO login (user_id, email, jwt_token)
               VALUES ($1, $2, $3)`,
        values: [user.user_id, email, token],
      };
      await pool.query(insertTokenQuery);
      console.log("jwt updated successfully");
    }

    pool.release();

    res.json({ Token: token });
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ error: "Invalid credential" });
  }
});

const getUserDetails = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  // console.log(userId);

  try {
    const pool = await dbPool.connect();

    const userQuery = {
      text: `SELECT * FROM users WHERE id = $1`,
      values: [userId],
    };

    const paymentQuery = {
      text: `SELECT paypal_payment_link FROM payments WHERE user_id = $1`,
      values: [userId],
    };

    const userResult = await pool.query(userQuery);
    const paymentResult = await pool.query(paymentQuery);

    pool.release();

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userDetails = {
      ...userResult.rows[0],
      paypal_payment_link: paymentResult.rows[0]?.paypal_payment_link || null,
      payment_status: paymentResult.rows[0]?.payment_status || null,
    };
    res.json(userDetails);
  } catch (err) {
    console.error("Error fetching user details:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

const updateUserDetails = async (req, res) => {
  const userId = req.params.id;
  // console.log(userId);
  const { first_name, last_name, email, phone, password } = req.body;
  // console.log(first_name, last_name, email, phone, password);
  try {
    const pool = await dbPool.connect();

    const updateloginQuery = {
      text: `update login SET password =md5($1) where user_id = $2`,
      values: [password, userId],
    };
    const userResult = await pool.query(updateloginQuery);
    // console.log("came");
    const updateQuery = {
      text: `
      UPDATE users
      SET
        first_name = $1,
        last_name = $2,
        email = $3,
        phone = $4 where id = $5
    `,
      values: [first_name, last_name, email, phone, userId],
    };
    const updatedUser = await pool.query(updateQuery);
    // console.log("came after");

    if (updatedUser.rowCount > 0 && userResult.rowCount > 0) {
      res.status(200).json({
        message: "User details updated successfully",
        user: updatedUser.rows[0],
      });
    } else {
      res.status(404).json({ message: "User not found or not updated" });
    }
  } catch (error) {
    console.error("Error updating user details:", error);
    res.status(500).json({ message: "Failed to update user details" });
  }
};

module.exports = {
  getAll,
  signUp,
  login,
  success,
  getUserDetails,
  updateUserDetails,
};
