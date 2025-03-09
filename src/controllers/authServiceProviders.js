const User = require('../models/User');
const ServiceProviders = require('../models/ServiceProvider');
const Booking = require('../models/Bookings');
const sendEmail = require('../utils/mailer')


const notifyUser = (email) => {
    const to = email
    const subject ='Thank You for Signing Up'
    const text = 'Thank you for signig up with HandyConncet'

    sendEmail(to, subject, text)
}

// Fetch all service providers
const fetchAllSP = async (req, res) => {
    try {
        const providerCompanies = await ServiceProviders.find()

        if (!providerCompanies.length) {
            console.log('No service providers found.');
            return res.status(404).json({ message: 'No service providers found.' });
        }

        res.status(200).json({ 
            message: 'Successfully fetched provider and companies', 
            data:  providerCompanies
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'An error occurred while fetching service providers' });
    }
};

const submitBooking = async (req, res) => {
    try {
        // Extract fields from request body
        const { service, date, time, problem_description, service_provider, user, location } = req.body;

        // Validate required fields
        if (!service || !date || !time || !service_provider || !user || !location) {
            console.log('Missing required fields:', { service, date, time, service_provider, user, location });
            return res.status(400).json({ message: "All required fields must be provided" });
        }

        // Create the booking
        const booking = await Booking.create({
            service,
            date,
            time,
            problem_description,
            service_provider,
            user,
            location
        });

        // Send success response
        return res.status(201).json({
            message: "Booking Created Successfully",
            data: booking
        });

    } catch (error) {
        // Log the full error for debugging
        console.error('Booking creation error:', error);
        
        // Send error response
        return res.status(500).json({
            message: "Failed to create Booking",
            error: error.message
        });
    }
}

const statusUpdate = async (req, res) => {
    try {
        const {status, bookingId} = req.body

        if(!status || !bookingId){
            return res.status(404).json({message:'Status not found in payload'})
        } 
        console.log('status:', status)
        console.log('booking:', bookingId)

        const validStatuses = ['pending', 'accepted', 'completed', 'declined'];
        if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
        }

        
        const booking = await Booking.findByIdAndUpdate(
            bookingId,
            {status},
            {new:true}
        ).lean()
        if(!booking){
        return res.status(404).json({message: 'Cannot find booking'})
        }
        console.log('Updated Booking:', booking);


        return res.status(200).json({message:'Succesfully updated status', data:booking})
    } catch (error) {
        console.log(error.stack)
        return res.status(500).json({message:'Error updating status'})
    }
  }

const fetchCustomerBookings = async (req,res) => {
    try{
        console.log(req.body)
        const {user} = req.body
        console.log(user)

        if (!user || !user._id) {
            return res.status(404).json({ message: "User ID is required to fetch bookings." });
        }

        console.log("Fetching bookings for user:", user._id);

        const user_bookings = await Booking.find({user: user._id})
        console.log(user_bookings)
        if(!user_bookings || user_bookings.length === 0 ){
            return res.status(400).json({message:'Error fetching the bookings '})
        }

        return res.status(200).json({message: 'Successfully fetched all bookings', data:user_bookings })
    }catch(error){
        console.log(error.stack)
        return res.status(500).json({
            message:"error fetching bookings",
            error: error.message   
        })
    }
}

const fetchCustomer = async (req,res) => {
    try {
 
        const {booking} = req.body

        if(!booking.user){
            console.log('customer not found')
        }

        const customer = booking.user
    
        const customerInfo = await User.findOne({_id: customer})
        console.log('customer info:', customerInfo)
        return res.status(200).json({message:'successfully fetched booking', data: customerInfo})
    } catch (error) {
        console.log(error.stack)
        return res.status(500).json({
            message:"error fetching booking",
            error: error.message   
        })
    }
}


const fetchProviderBookings = async (req, res) => {
    try {
        const { user } = req.body;

        if (!user || !user._id) {
            return res.status(400).json({ message: "User ID is required to fetch bookings." });
        }

        const userId = user._id;

        // Fetch the service provider associated with the user
        const serviceProvider = await ServiceProviders.findOne({ user: userId });

        if (!serviceProvider) {
            return res.status(404).json({ message: "Service provider not found for the given user." });
        }

        console.log("Fetching bookings for user:", serviceProvider.companyName);

        // Fetch bookings associated with the service provider
        const provider_bookings = await Booking.find({ service_provider: serviceProvider._id });

        if (!provider_bookings || provider_bookings.length === 0) {
            return res.status(404).json({ message: "No bookings found for the current user." });
        }

        // Collect customer IDs from the bookings
        const customerIds = provider_bookings.map((booking) => booking.user);
        console.log(customerIds)
        // Fetch customer information for each unique customer ID
        const uniqueCustomerIds = [...new Set(customerIds)]; // Ensure unique IDs
        const customersInfo = await User.find({ _id: { $in: uniqueCustomerIds } });

        // Return the bookings and customer information
        return res.status(200).json({
            message: "Successfully fetched all bookings.",
            bookings: provider_bookings,
            customers: customersInfo,
        });
    } catch (error) {
        console.error(error.stack);
        return res.status(500).json({
            message: "Error fetching bookings.",
            error: error.message,
        });
    }
};


// Fetch service providers by service type
const fetchByService = async (req, res) => {
    try {
        const {service} = req.body
        console.log(service)
     
        if (!service.Title || !service) {
            return res.status(400).json({ message: 'Service type is required.' });
        }

        console.log(service.Title)

        const title = service.Title.toLowerCase()
        console.log("Title:", title)

        const serviceProviders = await ServiceProviders.find({
            services: { $regex: new RegExp(`\\b${title}\\b`, 'i') }, // Matches partial or full word case-insensitively
        });

        if (!serviceProviders.length) {
            console.log(`No service providers found for service type: ${service.Title}`);
            return res.status(404).json({ message: `No service providers found for service type: ${service.Title}` });
        }

        res.status(200).json({ 
            message: `Successfully found service providers for service type: ${service.Title}`, 
            data: serviceProviders 
        });
    } catch (error) {
        console.error('Error fetching providers:', error.stack);
        res.status(500).json({ message: 'An error occurred while fetching service providers by service type.' });
    }
};


const fetchServiceProviderInfo = async (req, res) => {
    try {
        const { providerId } = req.body;

        if (!providerId) {
            return res.status(400).json({ message: 'Provider ID is required.' });
        }

        const provider = await ServiceProviders.findById(providerId).lean();
        console.log('provider:', provider)

        if(!provider){
            return res.status(404).json({message: 'Provider not found'})
        }

        return res.status(200).json({message:'Successfully fetched provider', data:provider})
    } catch (error) {
        console.error('Error fetching provider:', error.stack);
        res.status(500).json({ message: 'An error occurred while fetching service provider information.' });
    }
}

const fetchAllUsers = async (req, res) => {
    try {
        const allServiceProviders = await User.find()
        res.status(200).json({message:'fetched all users', data:allServiceProviders })
    } catch (error) {
        console.error(error.stack)
        res.status(500).json({message:'Failed to fetch users'})
    }
}




module.exports = {notifyUser, fetchAllSP, fetchByService, submitBooking, fetchCustomerBookings, fetchProviderBookings, fetchCustomer, statusUpdate, fetchServiceProviderInfo, fetchAllUsers};
