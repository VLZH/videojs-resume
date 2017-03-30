import videojs from 'video.js';
import store from 'store';
const Button = videojs.getComponent('Button');
const Component = videojs.getComponent('Component');
const ModalDialog = videojs.getComponent('ModalDialog');

class ResumeButton extends Button {

  constructor(player, options) {
    super(player, options);
    this.resumeFromTime = options.resumeFromTime;
    this.player = player;
  }

  buildCSSClass() {
    return 'vjs-resume';
  }

  createEl() {
    return super.createEl('button', {
      innerHTML: `${this.options_.buttonText}`
    });
  }

  handleClick() {
    this.player_.resumeModal.close();

    var run = function() {
      this.player_.play();
      this.player_.currentTime(this.resumeFromTime);
      this.player_.trigger('resumevideo');
    }.bind(this);

    if(this.player_.duration() === 0){
      this.player_.load();
      this.player_.one("loadedmetadata", run)
    }else{
      run()
    }
  }

  handleKeyPress(event) {
    // Check for space bar (32) or enter (13) keys
    if (event.which === 32 || event.which === 13) {
      if (this.player.paused()) {
        this.player.play();
      } else {
        this.player.pause();
      }
      event.preventDefault();
    }
  }
}

ResumeButton.prototype.controlText_ = 'Resume';

class ResumeCancelButton extends Button {

  buildCSSClass() {
    return 'vjs-no-resume';
  }

  createEl() {
    return super.createEl('button', {
      innerHTML: `${this.options_.buttonText}`
    });
  }

  handleClick() {
    this.player_.resumeModal.close();
    store.remove(this.options_.key);
  }
}
ResumeButton.prototype.controlText_ = 'No Thanks';

class ModalButtons extends Component {

  constructor(player, options) {
    super(player, options);
    this.addChild('ResumeButton', {
      buttonText: options.resumeButtonText,
      resumeFromTime: options.resumeFromTime
    });
    this.addChild('ResumeCancelButton', {
      buttonText: options.cancelButtonText,
      key: options.key
    });
  }

  createEl() {
    return super.createEl('div', {
      className: 'vjs-resume-modal-buttons',
      innerHTML: `
        <p>${this.options_.title}</p>
      `
    });
  }
}

class ResumeModal extends ModalDialog {

  constructor(player, options) {
    super(player, options);
    this.player_.resumeModal = this;
    this.open();
    this.addChild('ModalButtons', {
      title: options.title,
      resumeButtonText: options.resumeButtonText,
      cancelButtonText: options.cancelButtonText,
      resumeFromTime: options.resumeFromTime,
      key: options.key
    });
  }

  buildCSSClass() {
    return `vjs-resume-modal ${super.buildCSSClass()}`;
  }

  open(){
    this.player_.addClass("vjs-resumemodal");
    super.open();
  }

  close(){
    this.player_.removeClass("vjs-resumemodal");
    super.close();
  }
}


videojs.registerComponent('ResumeButton', ResumeButton);
videojs.registerComponent('ResumeCancelButton', ResumeCancelButton);
videojs.registerComponent('ModalButtons', ModalButtons);
videojs.registerComponent('ResumeModal', ResumeModal);

const Resume = function (options) {
  let msg, key;
  //Check store
  if (!store) {
    return videojs.log('store.js is not available');
  }
  if (!store.enabled) {
    msg = 'Local storage is not supported by your browser.';
    msg += ' Please disable "Private Mode", or upgrade to a modern browser.';
    return videojs.log(msg);
  }

  let title = options.title || 'Resume from where you left off?';
  let resumeButtonText = options.resumeButtonText || 'Resume';
  let cancelButtonText = options.cancelButtonText || 'No Thanks';
  let playbackOffset = options.playbackOffset || 0;

  this.on('timeupdate', function () {
    let time = this.currentTime();
    if (time > 0 && key) { // fix bug in chrome
      store.set(key, time);
    }
  });

  this.on('ended', function () {
    store.remove(key);
  });
  // You should to fire the event "ready_forresume" yourself
  this.on("videojs-showresume", function (e, _key) {
    key = 'videojs-resume:' + _key;
    let resumeFromTime = store.get(key);

    if (resumeFromTime) {
      if (resumeFromTime >= 5) {
        resumeFromTime -= playbackOffset;
      }
      if (resumeFromTime <= 0) {
        resumeFromTime = 0;
      }
      let modal_options = {
        title,
        resumeButtonText,
        cancelButtonText,
        resumeFromTime,
        key
      };
      if (this.player_.resumeModal) this.player_.removeChild(this.player_.resumeModal);
      this.addChild('ResumeModal', modal_options);
    }
  })
};

videojs.plugin('Resume', Resume);