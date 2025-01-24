const visualizerContainer = document.getElementById('visualizerContainer');
const visualizerCanvas = document.getElementById('visualizerCanvas');
const audioFileInput = document.getElementById('audioFileInput');
const visualizerContext = visualizerCanvas.getContext('2d');
let audioStreamSource;
let audioDataAnalyzer;
let visualizationStyle = 'linear'; // Default visualization style

const controls = [
	'play-large',
	'play',
	'progress',
	'current-time',
	'duration',
	'mute',
	'volume',
	'captions',
	'settings',
	'pip',
	'airplay',
	'download',
	'fullscreen'
];

const audioElement = document.getElementById('audioPlayer');
const player = new Plyr('#audioPlayer', { controls });

player.on("ready", () => {
	updateAudioSource(audioElement, '/public/audio/song.mp3');

	document.addEventListener('click', () => {
		if (!audioStreamSource) {
			initializeAudioPlayer(audioElement);
		}
	});
});

visualizerCanvas.width = window.innerWidth;
visualizerCanvas.height = window.innerHeight + 400;

function initializeAudioPlayer(audioElement) {
	const audioProcessingContext = new AudioContext();
	audioStreamSource = audioProcessingContext.createMediaElementSource(audioElement);
	audioDataAnalyzer = audioProcessingContext.createAnalyser();
	audioStreamSource.connect(audioDataAnalyzer);
	audioDataAnalyzer.connect(audioProcessingContext.destination);
	audioDataAnalyzer.fftSize = 512;

	const frequencyDataLength = audioDataAnalyzer.frequencyBinCount;
	const frequencyDataArray = new Uint8Array(frequencyDataLength);

	animateFrequencyBars(frequencyDataLength, frequencyDataArray);
}

function updateAudioSource(audioElement, newSource) {
	audioElement.src = newSource;
	audioElement.load();

	const downloadButton = document.querySelector('.plyr__controls [data-plyr="download"]');
	if (downloadButton) {
		downloadButton.setAttribute('href', newSource);
	}
}

function animateFrequencyBars(frequencyDataLength, frequencyDataArray) {
	visualizerContext.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
	audioDataAnalyzer.getByteFrequencyData(frequencyDataArray);
	renderFrequencyBars(frequencyDataLength, frequencyDataArray);
	requestAnimationFrame(() => animateFrequencyBars(frequencyDataLength, frequencyDataArray));
}

audioFileInput.addEventListener('change', function () {
	const audioElement = document.getElementById('audioPlayer');
	updateAudioSource(audioElement, URL.createObjectURL(this.files[0]));
});

function renderFrequencyBars(frequencyDataLength, frequencyDataArray) {
	if (visualizationStyle === "linear") {
		const barWidth = (visualizerCanvas.width / frequencyDataLength) * 1.2;
		for (let i = 0; i < frequencyDataLength; i++) {
			const currentBarHeight = frequencyDataArray[i] * 5.2; // Increased multiplier for higher bars
			const xPos = i * barWidth;
			const yPos = visualizerCanvas.height; // Start from bottom

			visualizerContext.fillStyle = `hsl(${i}, 100%, 50%)`;
			visualizerContext.fillRect(xPos, yPos, barWidth, -currentBarHeight); // Use negative height to draw upward
		}
	} else if (visualizationStyle === 'circular') {
		const centerX = visualizerCanvas.width / 2;
		const centerY = visualizerCanvas.height / 2;
		const minRadius = 0; // Start from center
		const maxRadius = 150;
		const angleIncrement = (2 * Math.PI) / frequencyDataLength;

		for (let i = 0; i < frequencyDataLength; i++) {
			const currentBarHeight = (frequencyDataArray[i] * 2);
			const angle = i * angleIncrement;

			const x = centerX + Math.cos(angle) * currentBarHeight;
			const y = centerY + Math.sin(angle) * currentBarHeight;

			visualizerContext.beginPath();
			visualizerContext.moveTo(centerX, centerY);
			visualizerContext.lineTo(x, y);
			visualizerContext.strokeStyle = `hsl(${i}, 100%, 50%)`;
			visualizerContext.lineWidth = 4;
			visualizerContext.stroke();
		}
	} else if (visualizationStyle === 'waves') {
		visualizerContext.beginPath();
		visualizerContext.moveTo(0, visualizerCanvas.height / 2);

		for (let i = 0; i < frequencyDataLength; i++) {
			const x = (visualizerCanvas.width / frequencyDataLength) * i;
			const y = (visualizerCanvas.height / 2) + (frequencyDataArray[i] - 128) * 2;

			if (i === 0) {
				visualizerContext.moveTo(x, y);
			} else {
				visualizerContext.lineTo(x, y);
			}
		}

		visualizerContext.strokeStyle = `hsl(${Date.now() % 360}, 100%, 50%)`;
		visualizerContext.lineWidth = 3;
		visualizerContext.stroke();
	}
	else if (visualizationStyle === 'multiwave') {
		// Split frequency data into low, mid, and high ranges
		const lowEnd = Math.floor(frequencyDataLength / 3);
		const midEnd = lowEnd * 2;

		// Draw three separate waves
		const ranges = [
			{ start: 0, end: lowEnd, color: 'hsl(0, 100%, 50%)', offset: 200 },
			{ start: lowEnd, end: midEnd, color: 'hsl(120, 100%, 50%)', offset: 0 },
			{ start: midEnd, end: frequencyDataLength, color: 'hsl(240, 100%, 50%)', offset: -200 }
		];

		ranges.forEach(range => {
			visualizerContext.beginPath();
			for (let i = range.start; i < range.end; i++) {
				const x = (visualizerCanvas.width / (range.end - range.start)) * (i - range.start);
				const y = (visualizerCanvas.height / 2) + range.offset + (frequencyDataArray[i] - 128) * 2;

				if (i === range.start) {
					visualizerContext.moveTo(x, y);
				} else {
					visualizerContext.lineTo(x, y);
				}
			}
			visualizerContext.strokeStyle = range.color;
			visualizerContext.lineWidth = 3;
			visualizerContext.stroke();
		});
	}
}

function changeVisualizationStyle(style) {
	visualizationStyle = style;
	visualizerContext.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
	if (audioDataAnalyzer) {
		const frequencyDataLength = audioDataAnalyzer.frequencyBinCount;
		const frequencyDataArray = new Uint8Array(frequencyDataLength);
		audioDataAnalyzer.getByteFrequencyData(frequencyDataArray);
		renderFrequencyBars(frequencyDataLength, frequencyDataArray);
	}
}

// Add event listener for visualization style selection
document.getElementById('visualizationStyle').addEventListener('change', function () {
	changeVisualizationStyle(this.value);
});