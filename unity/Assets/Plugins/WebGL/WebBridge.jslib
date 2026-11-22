// Creates bridge between Unity and browser
// Browser should have a function called openUserProfile(userId) to handle the request
mergeInto(LibraryManager.library, {

    OpenProfile: function(ptr) {
        const userId = UTF8ToString(ptr);

        if (window.openUserProfile) {
            window.openUserProfile(userId);
        }
    },

    NotifyRSVPReady: function() {

        if (window.onRSVPReady) {
            window.onRSVPReady();
        }
    }
});