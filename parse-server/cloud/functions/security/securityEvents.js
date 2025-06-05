/* global Parse */

// Track login attempts
Parse.Cloud.beforeLogin(async request => {
  const { object: user } = request;
  
  try {
    const SecurityEvent = Parse.Object.extend('SecurityEvent');
    const event = new SecurityEvent();
    
    await event.save({
      type: 'login',
      status: 'attempted',
      userId: user.id,
      eventDate: new Date()
    }, { useMasterKey: true });
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
});

// Track failed logins
Parse.Cloud.afterLogin(async request => {
  const { object: user } = request;
  
  try {
    const SecurityEvent = Parse.Object.extend('SecurityEvent');
    const event = new SecurityEvent();
    
    await event.save({
      type: 'login',
      status: 'success',
      userId: user.id,
      eventDate: new Date()
    }, { useMasterKey: true });
  } catch (error) {
    console.error('Error logging successful login:', error);
  }
});

// Track role changes
Parse.Cloud.beforeSave(Parse.Role, async request => {
  const role = request.object;
  
  if (!role.isNew()) {
    try {
      const SecurityEvent = Parse.Object.extend('SecurityEvent');
      const event = new SecurityEvent();
      
      await event.save({
        type: 'roleChange',
        status: 'success',
        userId: request.user ? request.user.id : 'system',
        eventDate: new Date()
      }, { useMasterKey: true });
    } catch (error) {
      console.error('Error logging role change:', error);
    }
  }
});

module.exports = {
  // Export any functions if needed
};
