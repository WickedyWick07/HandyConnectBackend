const express = require('express')
const router = express.Router()
const { authenticateJWT } = require('../middleware/authMiddleware');
const {fetchAllSP, fetchByService, submitBooking, fetchCustomerBookings, fetchProviderBookings, fetchCustomer, statusUpdate, fetchServiceProviderInfo, fetchAllUsers} = require('../controllers/authServiceProviders')
router.post('/fetch-by-service', fetchByService)
router.get('/fetch-service-providers', fetchAllSP)
router.get('/fetch-all-service-providers', fetchAllUsers)
router.post('/submit-booking', submitBooking)
router.post('/fetch-customer-bookings', fetchCustomerBookings)
router.post('/fetch-provider-bookings', fetchProviderBookings)
router.post('/fetch-customer', fetchCustomer)
router.post('/fetch-service-provider', fetchServiceProviderInfo)
router.patch('/fetch-provider-bookings', authenticateJWT, statusUpdate)

module.exports = router