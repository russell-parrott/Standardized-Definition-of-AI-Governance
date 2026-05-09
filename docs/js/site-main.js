"use strict"

// ============================================================
// DAREB APPLICATION
// ============================================================

const STORAGE_KEY = "dareb_answers_v2";
const DATA_URL = "./js/dareb-master-complete.json";
const { jsPDF } = window.jspdf;
const doc = new jsPDF();
const left = 25;
const maxWidth = 160;
const pageBottom = 272;

let sections = [];
let expanded = false;
let currentSection = 0;
let score = 0;
let answers = {};
let y = 25;

// ============================================================
// LOAD DATA
// ============================================================

async function loadData() {
	try {
		const response = await fetch(DATA_URL);
		if (!response.ok) {
			throw new Error(`Failed to load JSON: ${response.status}`);
		}
		sections = await response.json();
		sections.forEach((section,sectionIndex) => {
			let clone = document.getElementById('section-card').content.cloneNode(true);
			let sectionDiv = clone.querySelector('div');
			sectionDiv.id = section.section.toLowerCase();
			sectionDiv.classList.add('section');
			sectionDiv.dataset.index = sectionIndex;
			if(sectionIndex !== 0){
				sectionDiv.style.display = 'none';
			}
			sectionDiv.querySelector('h3').innerHTML = section.section;
			sectionDiv.querySelector('h3').insertAdjacentHTML('afterend',section.section_description);
			section.questions.forEach(question => {
				let questionClone = document.getElementById('question-card').content.cloneNode(true);			
				let buttons = questionClone.querySelectorAll('button');
				buttons.forEach(button=>{				
					button.addEventListener('click',function(){
						let answer = this.dataset.answer;
						let questionKey = section.section + '_' + question.id;
						if(answers[questionKey] !== undefined){
							score -= answers[questionKey];
						}
						let value = answer === 'yes' ? 0 : 1;
						answers[questionKey] = value;
						score += value;						
						buttons.forEach(btn=>{
							btn.classList.remove('active');
						});
						this.classList.add('active');
					})
				})
				questionClone.querySelector('span').innerHTML = question.question;
				questionClone.querySelector('span').insertAdjacentHTML('afterend',question.what_this_means);
				sectionDiv.appendChild(questionClone);								
			});
			let buttonClone = document.getElementById('button-card').content.cloneNode(true);
			buttonClone.querySelectorAll('button').forEach(button=>{
				button.addEventListener('click',function(){
					let direction = this.dataset.direction;
					let sectionsOnPage = document.querySelectorAll('[data-index]');
					if(direction === 'next'){   
						let currentDiv = sectionsOnPage[currentSection];
						if(!allQuestionsAnswered(currentDiv)) {
							alert('Please answer all questions first!');
							return;
						}
						sectionsOnPage[currentSection].style.display = 'none';
						currentSection++;
					}    
					if(direction === 'back'){
						sectionsOnPage[currentSection].style.display = 'none';
						currentSection--;
					}
					if(currentSection < 0){
						currentSection = 0;
					}
					if(currentSection >= sectionsOnPage.length){
						currentSection = sectionsOnPage.length - 1;
						// Get failed questions
						let failedQuestions = Object.keys(answers).filter(key => answers[key] === 1);
						// Group by section
						let grouped = {};
						failedQuestions.forEach(failedId => {
							let [sectionName, questionId] = failedId.split('_');
							if(!grouped[sectionName]) grouped[sectionName] = [];
							let section = sections.find(s => s.section === sectionName);
							let question = section.questions.find(q => q.id === questionId);
							grouped[sectionName].push(question);
						});
						// Generate PDF
						for(let sectionName in grouped) {
							let section = sections.find(s => s.section === sectionName);
							//HEADER
							addText(section.section,'heading')
							y += 4;
							addText('Description','subheading')
							y += 2;
							addText(section.section_description);
							y += 4;
							addText('Consequence','subheading')
							y += 2;
							addText(section.section_consequence);							
							y += 8;							
							grouped[sectionName].forEach(question => {
								//QUESTION ANSWERED
								addText(question.id+' '+question.question, 'heading')
								y += 4;
								addText(question.what_this_means);
								y += 4;
								addText('Explanation','subheading')
								y += 2;
								addText(question.explanation);
								y += 4;
								addText('Regulatory relevance','subheading')
								y += 2;
								addText(question.regulatory_relevance);
								y += 4;
								addText('Directors exposure','subheading')
								y += 2;
								addText(question.director_exposure);
								y += 8;								
								if(expanded != false && question.sub_questions) {
									question.sub_questions.forEach(subq => {
										//LEADS TO QUESTION
										addText(subq.question,'heading')
										y += 4;
										addText(subq.why_this_matters);
										y += 4;
										addText('Explanation','subheading')
										y += 2;
										addText(subq.finding_explanation);
										y += 4;
										addText('Regulatory relevance','subheading')
										y += 2;
										addText(subq.regulatory_relevance);
										y += 4;
										addText('Directors exposure','subheading')
										y += 2;
										addText(subq.director_exposure);
										y += 8;
									});
								}
							});
							doc.addPage();
							y = 25;
						}						
						let btn = document.createElement('button');
						btn.innerHTML = 'Generate PDF';
						btn.addEventListener('click', function(){
							doc.save("dareb.pdf")
						});
						document.getElementById('mainContent').appendChild(btn);
						return;						
					}
					sectionsOnPage[currentSection].style.display = 'block';
				})
			})
			sectionDiv.appendChild(buttonClone);			
			document.getElementById('mainContent').appendChild(clone);
		});	
	} catch (error) {
		console.error(error);
	}
}

function addText(text, variant = 'body') {
	// Set font size and style based on variant
	switch(variant) {
		case 'heading':
			doc.setFontSize(14);
			doc.setFont('helvetica', 'bold');
		break;
		case 'subheading':
			doc.setFontSize(12);
			doc.setFont('helvetica', 'bold');
		break;
		case 'body':
		default:
			doc.setFontSize(10);
			doc.setFont('helvetica', 'normal');
			break;
	}
	const lines = doc.splitTextToSize(String(text || ''), maxWidth);
	const height = doc.getTextDimensions(lines).h;
	// Check if we need a new page
	if (y + height > pageBottom) {
		doc.addPage();
		y = 25;
	}
	doc.text(lines, left, y);
	y += height;
	// Reset font to body for next call
	doc.setFontSize(10);
	doc.setFont('helvetica', 'normal');
}

function allQuestionsAnswered(sectionDiv) {
	let buttons = sectionDiv.querySelectorAll('button.active');
	let totalQuestions = sectionDiv.querySelectorAll('.question').length;
	return buttons.length === totalQuestions;
}

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