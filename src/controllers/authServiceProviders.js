const User = require('../models/User');
const ServiceProviders = require('../models/ServiceProvider');
const Booking = require('../models/Bookings');
const sendEmail = require('../utils/mailer')
const { notify } = require('../utils/notify');

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
    console.log('>>> SUBMIT BOOKING HIT');
    try {
        const { service, date, time, problem_description, service_provider, user, location } = req.body;

        if (!service || !date || !time || !service_provider || !user || !location) {
            return res.status(400).json({ message: "All required fields must be provided" });
        }

        const booking = await Booking.create({
            service, date, time, problem_description, service_provider, user, location
        });

        // Notify the provider (never let this break the booking itself)
        try {
            const [provider, customer] = await Promise.all([
                ServiceProviders.findById(service_provider).select('user companyName'),
                User.findById(user).select('firstName lastName').lean(),
            ]);

            const customerName =
                [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') || 'A customer';

            if (provider?.user) {
                await notify({
                    userId: provider.user,
                    type: 'appointment',
                    title: 'New booking request',
                    message: `${customerName} requested ${service} on ${date} at ${time}`,
                    link: '/provider-bookings',
                });
            }
        } catch (notifyErr) {
            console.error('Notification step failed:', notifyErr.message);
        }

        return res.status(201).json({
            message: "Booking Created Successfully",
            data: booking
        });

    } catch (error) {
        console.error('Booking creation error:', error);
        return res.status(500).json({
            message: "Failed to create Booking",
            error: error.message
        });
    }
}

const statusUpdate = async (req, res) => {
    try {
        const { status, bookingId } = req.body;

        if (!status || !bookingId) {
            return res.status(400).json({ message: 'Status or bookingId missing' });
        }

        const validStatuses = ['pending', 'accepted', 'completed', 'declined', 'incomplete'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const existing = await Booking.findById(bookingId).lean();
        if (!existing) {
            return res.status(404).json({ message: 'Cannot find booking' });
        }

        // Only the provider who owns this booking may change it
        const userId = req.user?.id || req.user?._id || req.user?.userId;
        const myProfile = await ServiceProviders.findOne({ user: userId }).select('_id');
        if (!myProfile || String(existing.service_provider) !== String(myProfile._id)) {
            return res.status(403).json({ message: 'This booking is not yours' });
        }

        // Allowed moves
        const allowed = {
            pending: ['accepted', 'declined'],
            accepted: ['completed', 'incomplete'],
            completed: ['accepted'],     // reopen
            incomplete: ['accepted'],    // reopen
            declined: ['accepted'],
        };
        if (!(allowed[existing.status] || []).includes(status)) {
            return res.status(400).json({ message: `Cannot change a ${existing.status} booking to ${status}` });
        }

        const booking = await Booking.findByIdAndUpdate(
            bookingId,
            { status },
            { new: true }
        ).lean();

        try {
            const provider = await ServiceProviders.findById(booking.service_provider).select('companyName');
            const statusText = {
                accepted: 'accepted',
                declined: 'declined',
                completed: 'marked as completed',
                incomplete: 'marked as incomplete',
                pending: 'set back to pending',
            }[status];

            await notify({
                userId: booking.user,
                type: 'appointment',
                title: `Booking ${status}`,
                message: `${provider?.companyName || 'Your provider'} ${statusText} your ${booking.service} booking`,
                link: '/all-bookings',
            });
        } catch (notifyErr) {
            console.error('Notification step failed:', notifyErr.message);
        }

        return res.status(200).json({ message: 'Successfully updated status', data: booking });
    } catch (error) {
        console.log(error.stack);
        return res.status(500).json({ message: 'Error updating status' });
    }
};

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
