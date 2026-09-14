// =========================================
// GET ALL PROFILE BUTTONS
// =========================================

const profileButtons =
    document.querySelectorAll(".profile-button");



// =========================================
// GET MODAL ELEMENTS
// =========================================

const profileModal =
    document.getElementById("profileModal");

const modalClose =
    document.getElementById("modalClose");

const modalOverlay =
    document.querySelector(".modal-overlay");



// =========================================
// GET PROFILE INFORMATION AREAS
// =========================================

const modalName =
    document.getElementById("modalName");

const modalRole =
    document.getElementById("modalRole");

const modalBio =
    document.getElementById("modalBio");

const modalGithub =
    document.getElementById("modalGithub");

const modalLinkedin =
    document.getElementById("modalLinkedin");



// =========================================
// OPEN PROFILE MODAL
// =========================================

profileButtons.forEach(button => {

    button.addEventListener("click", () => {

        // Get the information stored in the button
        const name =
            button.dataset.name;

        const role =
            button.dataset.role;

        const bio =
            button.dataset.bio;

        const github =
            button.dataset.github;

        const linkedin =
            button.dataset.linkedin;


        // Put the information into the modal
        modalName.textContent =
            name;

        modalRole.textContent =
            role;

        modalBio.textContent =
            bio;


        // Set profile links
        modalGithub.href =
            github;

        modalLinkedin.href =
            linkedin;


        // Show modal
        profileModal.classList.add("active");

        document.body.classList.add("modal-open");

    });

});



// =========================================
// CLOSE PROFILE MODAL
// =========================================

function closeModal() {

    profileModal.classList.remove("active");

    document.body.classList.remove("modal-open");

}



// Close using X button
modalClose.addEventListener(
    "click",
    closeModal
);



// Close by clicking outside the profile window
modalOverlay.addEventListener(
    "click",
    closeModal
);



// Close using Escape key
document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            profileModal.classList.contains("active")
        ) {

            closeModal();

        }

    }
);