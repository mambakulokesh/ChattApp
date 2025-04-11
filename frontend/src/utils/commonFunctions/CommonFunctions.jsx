import Swal from "sweetalert2";
export const triggerAlert = (icon, title, message) => {
    return Swal.fire({
        icon: icon,
        title: title,
        text: message,
        timer: 4000,
    })
}