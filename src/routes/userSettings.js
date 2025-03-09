
const express = require('express'); 
const router = express.Router();
const {updateLanguage, updateRegion, deleteProfile, updatePushNotifications, fetchUserSettings, changePassword} = require('../controllers/UserSettings');

router.post('/settings/update-language', updateLanguage)
router.post('/settings/update-region', updateRegion)
router.delete('/users/:id', deleteProfile)
router.post('/settings/update-push-notifications', updatePushNotifications)
router.post('/settings/fetch-user-settings', fetchUserSettings)
router.patch('/settings/change-password', changePassword)

module.exports = router;