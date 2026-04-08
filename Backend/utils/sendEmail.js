const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "Email service is not configured. Set EMAIL_USER and EMAIL_PASS in backend .env"
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Neo Chat Support" <${process.env.EMAIL_USER}>`,
      to: options.email,        
      subject: options.subject, 
      html: options.message,    
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.email}`);
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw new Error("Email could not be sent");
  }
};

module.exports = sendEmail;
