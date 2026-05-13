emailjs.init({	publicKey: "3Bb98Nyu6Gi7MoJqx" });
document.getElementById('form-enquiry').addEventListener('submit', function (evt) {
	evt.preventDefault(); 
	var templateParams = {
		name: document.getElementById('name').value,
		enquiry: document.getElementById('enquiry').value,
		message: document.getElementById('message').value,
		email: document.getElementById('email').value
	};
	emailjs.send("service_7adde56", "template_zn882e5", templateParams)
	.then((response) => {
		console.log('SUCCESS!', response.status, response.text);
		document.querySelector('.fields').setAttribute('hidden', '');
		document.querySelector('.success-message').removeAttribute('hidden');
		document.getElementById('form-enquiry').reset()
	}).catch((error) => {
		console.log('FAILED...', error);
	});
});