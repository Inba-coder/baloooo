# Mani Construction Materials Website

A modern, responsive website for Mani Construction Materials with backend integration for user authentication and payment processing.

## Features

- **Modern UI/UX**: Responsive design with beautiful CSS styling
- **User Authentication**: Login and registration system with JWT tokens
- **Payment Processing**: Integration with Stripe and PayPal
- **Contact System**: Contact form with backend processing
- **Product Management**: Backend API for construction materials
- **Order Management**: Complete order processing system

## Project Structure

```
HTML.4(Mani constraction materials)/
├── styles.css              # Main CSS stylesheet
├── app.js                  # Frontend JavaScript
├── server.js              # Backend API server
├── package.json           # Node.js dependencies
├── env.example            # Environment variables template
├── login.html             # Login page
├── join.html              # Registration page
├── contact.html           # Contact page
├── payment.html           # Payment processing page
├── top.html               # Header component
├── col2.html              # Main content area
├── fornt.html             # Main page (frameset)
├── bottom.html            # Footer component
└── other HTML files...    # Additional pages
```

## Setup Instructions

### 1. Backend Setup

1. **Install Node.js** (version 14 or higher)

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy `env.example` to `.env`
   - Update the values with your actual credentials:
     ```env
     DB_HOST=localhost
     DB_USER=your_mysql_username
     DB_PASSWORD=your_mysql_password
     DB_NAME=mani_construction
     JWT_SECRET=your_super_secret_jwt_key
     STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
     PAYPAL_CLIENT_ID=your_paypal_client_id
     ```

4. **Set up MySQL database**:
   - Create a MySQL database named `mani_construction`
   - The server will automatically create the required tables

5. **Start the backend server**:
   ```bash
   npm start
   ```
   The server will run on `http://localhost:3000`

### 2. Frontend Setup

1. **Open the HTML files** in your web browser
2. **Update API endpoints** in `app.js` if needed:
   ```javascript
   this.baseURL = 'http://localhost:3000/api';
   ```

### 3. Payment Integration

#### Stripe Setup
1. Create a Stripe account at https://stripe.com
2. Get your publishable and secret keys
3. Update the keys in your `.env` file and `payment.html`

#### PayPal Setup
1. Create a PayPal Developer account
2. Create a new application
3. Get your client ID
4. Update the client ID in `payment.html`

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/profile` - Get user profile (requires auth)

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product

### Orders
- `POST /api/orders` - Create new order (requires auth)
- `GET /api/orders` - Get user orders (requires auth)

### Payments
- `POST /api/payments/stripe` - Process Stripe payment
- `POST /api/payments/paypal` - Process PayPal payment

### Contact
- `POST /api/contact` - Send contact message

## Usage

1. **Start the backend server**:
   ```bash
   npm start
   ```

2. **Open the website**:
   - Open `fornt.html` in your browser for the main page
   - Or open individual pages like `login.html`, `contact.html`, etc.

3. **Test the features**:
   - Register a new account
   - Login with your credentials
   - Browse products
   - Make payments
   - Contact support

## Development

### Running in Development Mode
```bash
npm run dev
```

### Testing
```bash
npm test
```

## Technologies Used

### Frontend
- HTML5
- CSS3 (with modern features like Grid, Flexbox, animations)
- JavaScript (ES6+)
- Stripe.js for payment processing
- PayPal SDK

### Backend
- Node.js
- Express.js
- MySQL2 for database
- JWT for authentication
- bcryptjs for password hashing
- Stripe for payment processing
- Nodemailer for email functionality

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation
- SQL injection prevention
- CORS configuration
- Rate limiting
- Helmet.js for security headers

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, contact:
- Email: support@maniconstruction.com
- Phone: 9585774780
- Address: Global Institute of Engg and Tech, AMBUR

## Changelog

### Version 1.0.0
- Initial release
- User authentication system
- Payment processing integration
- Modern responsive design
- Contact form functionality
- Product management system
