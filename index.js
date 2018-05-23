import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
// import App from './App';
import registerServiceWorker from './registerServiceWorker';

const filterSym = /[а-яё]+/mg; // буквы и буквосочетания русского алфавита
const wordLowercase = /[а-яё-]+/igm; // слово: русские буквы в любом регистре и дефис 


class SyllableFilter extends React.Component { // ввод строки с буквами и буквосочетаниями (= "элемент"), слова с которыми надо исключить из текста

	constructor (props) {
		super (props);
		this.handleChange = this.handleChange.bind(this);
		this.handleBlur = this.handleBlur.bind(this);
	}
	
	handleChange (e) {//контролирует ввод корректных символов; проверяет на дубли, кроме последнего элемента, который, возможно, введен ещё не до конца
		this.props.onSyllableFilterChange(adjustFilterString(e.target.value));
	}
	
	handleBlur (e) {//при потере фокуса проверяет на дубли всю строку, включая последний элемент
		this.props.onSyllableFilterChange(getStringByFilter(getFilterFromString(e.target.value)));
	}
	
	
	render () {
		let str = this.props.filterStr;
		
		return (
			<fieldset>
			 <legend> Введите буквы и сочетания букв, которые Вам сложно произносить: </legend>
			 <input type="text" value={str} onChange={this.handleChange} onBlur={this.handleBlur}/>
			</fieldset>
		);
	}
}

class TextToChange extends React.Component {// ввод текста, в котором надо найти слова с "трудными" буквами и буквосочетаниями

	constructor (props) {
		super (props);
		this.handleChange = this.handleChange.bind(this);
	}
	
	handleChange (e) {
		this.props.onTextChange(e.target.value);
	}
	
	render () {
		
		let userText = this.props.userText;
		
		return (
			<fieldset>
			 <legend> Введите Ваш текст: </legend>
			 <textarea value={userText} onChange={this.handleChange} rows="10" cols="50"/>
			</fieldset>
		);
	}
}

class WordToChange extends React.Component {// выбор слова на замену и синонима, на который его надо заменить
	
	constructor (props) {
		super (props);
		this.state = {wordIndex: 0};
		this.handleWordChoise = this.handleWordChoise.bind(this);
	}
	
	componentWillReceiveProps (nextProps) {
		let optionsWords = this.props.optionsWords;
		let newOptionsWords = nextProps.optionsWords;
		
		if (optionsWords.length !== newOptionsWords.length) return this.setState({wordIndex: 0});
				
		for (let i=0; i<optionsWords.length; i++) {
			if (optionsWords[i].props.children[1] !== newOptionsWords[i].props.children[1]) 
				return this.setState({wordIndex: 0});
		}
	}
	
	handleWordChoise (e) {
		const index = e.target.selectedIndex;
		this.setState({wordIndex: index});
	}
	
	render () {
		const onWordChange = this.props.onWordChange;
		const userText = this.props.userText;
		const dic = this.props.dic;
		const optionsWords = this.props.optionsWords;
		const index = this.state.wordIndex;
		const choosenWord = optionsWords[index].props.children[1]; 
		const synArr = dic.get(choosenWord).syn;
		const isNoSyn = synArr.length == 0;

		if (isNoSyn) {
				return (
					<div>
						<p> Слова на замену: </p>
						<select id="words" value={choosenWord} onChange={this.handleWordChoise}>
						  {optionsWords}
						</select>
						<p>Для выбранного слова нет синонимов.</p>
					</div>
				)
		} else {
			let optArr = [<option value={0} key={0}> Оставить без изменения </option>];
			for (let i=0; i<synArr.length; i++) optArr.push(<option value={synArr[i]} key={i+1}> {synArr[i]} </option>); // формирует новый список синонимов по выбранноу слову
			return (
				<div>
					<p> Слова на замену: </p>
					<select id="words" value={choosenWord} onChange={this.handleWordChoise}>
					  {optionsWords}
					</select>
					Варианты ====>
					<SynonymsChoise optArr={optArr} choosenWord={choosenWord} userText={userText} onWordChange={onWordChange}/>
				</div>
			)
	
		}
		
	}
	
}


class SynonymsChoise extends React.Component {// выбор синонима, на замену выбранному слову
	
	constructor (props) {
		super (props);
		this.handleSynonymChoise = this.handleSynonymChoise.bind(this);
	}
	
	handleSynonymChoise (e) {
		if (e.target.selectedIndex == 0) return; //Выбран пункт "Оставить без изменения"
		
		let choosenWord = this.props.choosenWord; // слово, которое надо заменить
		let newWord = e.target.value; // слово, на которое надо заменить
		const pattern = "(^|[^а-яё-])" + choosenWord + "($|[^а-яё-])"; //формирование шаблона для поиска слов на замену: начало строки или "небуква", потом выбранное слово, после которого идет "небуква" или конец строки
		const re = new RegExp (pattern, "mig");
		let newText = this.props.userText.replace(re, smartReplacer);
		this.props.onWordChange(newText);

		function smartReplacer (w1, lab1, lab2, offset,  tagStr) {// сохраняет при замене верхний регистр для всего слова или для первой буквы слова
			const testWordFirstChar = lab1.length; //номер позиции в найденной строке, в которой начинается слово на замену
			let findWord = w1.substr(testWordFirstChar, newWord.length);
			
			let testWord = findWord.toUpperCase();
			if (testWord == findWord) newWord = newWord.toUpperCase();
			else if (testWord.charAt(0) == findWord.charAt(0)) {
				let a = newWord.charAt(0).toUpperCase();
				newWord = a + newWord.substring(1);
			}	
			return lab1 + newWord + lab2;
		}
	}
	
	render () {
		return (
			<select id="synonyms" value={0} onChange={this.handleSynonymChoise}>
				{this.props.optArr}
			</select>
		)
	}
	
}


class SimpleWordMain extends React.Component {
	constructor(props) {
		super(props);
		this.state = {filterStr: "", userText: ""};
		this.handleSyllableFilter = this.handleSyllableFilter.bind(this);
		this.handleTextToChange = this.handleTextToChange.bind(this);
		this.handleWordToChange = this.handleWordToChange.bind(this);
		
	}
	
	handleSyllableFilter (filter) {
		this.setState ({filterStr: filter});
	}
	
	handleTextToChange (userTextToCheck) {
		this.setState ({userText: userTextToCheck});
	}
	
	handleWordToChange (newUserText) {
		this.setState ({userText: newUserText});
	}

	render () {
		const filterStr = this.state.filterStr;
		const userText = this.state.userText;
		const isFullCondition = filterStr && userText;
		

		if (isFullCondition) {// сформирован набор букв для исключения, и есть текст
			const listToChange = getWordsToChange (filterStr, userText);
			if (listToChange.size == 0) {// нет слов для замены
				return (
					<div>
						<SyllableFilter filterStr={filterStr} onSyllableFilterChange={this.handleSyllableFilter}/>
						<TextToChange userText={userText} onTextChange={this.handleTextToChange}/>
						<p> В тексте нет слов, которые надо менять. </p>
					</div>
				)
			} else { // есть слова для замены
				let optionsWords = [];
				for (let currentWord of listToChange.keys()) {
					let curWrd = listToChange.get(currentWord);
					optionsWords.push(<option value={currentWord} key={curWrd.id}> {currentWord} </option>);
				}	
				return (
					<div>
						<SyllableFilter filterStr={filterStr} onSyllableFilterChange={this.handleSyllableFilter}/>
						<TextToChange userText={userText} onTextChange={this.handleTextToChange}/>
						<WordToChange optionsWords={optionsWords} dic={listToChange} userText={userText} onWordChange={this.handleWordToChange}/>
					</div>
				)
			}
		} else {// не сформирован набор букв для исключения или нет текста
			return (
				<div>
					<SyllableFilter filterStr={filterStr} onSyllableFilterChange={this.handleSyllableFilter}/>
					<TextToChange userText={userText} onTextChange={this.handleTextToChange}/>
				</div>
			)
		}
	}
}
	
ReactDOM.render(
 <SimpleWordMain />,
 document.getElementById('root')
);

function adjustFilterString (s) { // возвращает набор разрешенных букв и/или буквосочетаний по строке == "набор элементов"

	let a = s.toLowerCase().match(filterSym); // взять из строки все элементы
	if (a == null) return ""; // если элементов в строке не было, то вернуть пустую строку

	let lastSym = s[s.length-1].toLowerCase();
	let isAddSpace = (lastSym === " ") || (!filterSym.test(lastSym) && s.length > 1 && s[s.length-2] === " ");
	// является ли последний символ пробелом или неразрешенным символом, перед которым стоит пробел? = "нужно ли в конце строки добавлять пробел?"

	let lastElm = a.length > 1 && !isAddSpace ? a.pop() : "";
	// в строке больше одного элемента и пробел в конце добавлять не надо (= "ввод полседнего элемента, возможно, не закончился") === последний элемент не надо проверять на наличие дубля среди остальных элементов из строки.
	
	let filterStr = new Set ();
	for (let i=0; i<a.length; i++) filterStr.add(a[i]); // отбросить дубли
	
	// создает сроку с отброшенными дублями и только с разрешенными элементами, разделенными пробелами, добавляя в конце, если нужно - пробел или пробел с элементом, ввод которого, возможно, не окончен
	a = [];
	for (let s of filterStr.values()) a.push(s);  
	return a.join(' ') + (isAddSpace ? " " : "") + (lastElm === "" ? "" : " " + lastElm);
	
}

function getWordsToChange (filterStr, userText) { 
/* 
возвращает набор слов, в которых есть буквы и буквосочетания, которые надо замениить на синонимы; 
строка с фильтром - filterStr - не пустая и корректная;
текст - userText - не пустой, но может не содержать ни одного русского слова или ни одного слова, которое надо заменить; в этом случае возвращается пустой набор;
*/	
	let a = userText.toLowerCase().match(wordLowercase);
	
	if (a == null) return new Map(); 
	
	// создать набор букв и буквосочетаний для проверки на наличие в словах
	let charFilter = new Set();
	charFilter = getFilterFromString (filterStr);

	// создать набор слов, для которых нужно искать синонимы
	let userFilteredWord = new Map();
	let num = 0;
	for (let i=0; i<a.length; i++) {
		let currentWord = a[i];
		if (userFilteredWord.has(currentWord)) continue;
		let currentWordFilterIndex = getFilterIndex(currentWord, charFilter);
		if (currentWordFilterIndex !== 0) {
			num++;
			userFilteredWord.set(currentWord, {index: currentWordFilterIndex, id: num, syn: getSyn(currentWord)});
		}
	}
	
	return userFilteredWord;
	
}


function getFilterIndex (word, fltr) {
// считает, сколько в слове букв и буквосочетаний, которые установлены в фильтре
  let res = 0;
  word = word.toLowerCase();
  for (let elm of fltr) {
	 let initpos = 0;
	 while (true) {
		let a = word.indexOf(elm, initpos);
		if (a == -1) break;
		res++;
		initpos = a+1;
	 }
  }
  return res;
}


function getFilterFromString (s) { // возвращает набор букв и буквосочетаний по строке c корректными символами; убирает дубли
	let a = s.toLowerCase().match(filterSym);
	let filterStr = new Set ();
	
	if (a !== null) {
		for (let i=0; i<a.length; i++) filterStr.add(a[i]);
	}	
	return filterStr;
}

function getStringByFilter (filterStr) { //возвращает строку, сформированную из входного набора букв и буквосочетаний через одиночный пробел
	if (filterStr.size == 0) return ""; 
	let a = [];
	for (let s of filterStr.values()) a.push(s);  
	return a.join(' ');
} 

	
function getSyn (a) {//генерация синонимов: слов случайной длины от 3 до 13 одинаковых символов для каждого символа исходного слова
	const word = a.toLowerCase();
	let syn = [];
	for (let i=0; i<word.length; i++) {
		let randSyn = new Array(3+Math.round(10*Math.random())).join(word[i]);
		syn.push(randSyn);
	}
	return syn;
}


registerServiceWorker();
