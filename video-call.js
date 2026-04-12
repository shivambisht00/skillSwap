(() => {
  class SkillSwapVideoCall {
    constructor() {
      this.cacheReady = false;
      this.localStream = null;
      this.remoteStream = null;
      this.screenStream = null;
      this.pcLocal = null;
      this.pcRemote = null;
      this.videoSender = null;
      this.timerId = null;
      this.seconds = 0;
      this.isMicOn = true;
      this.isCamOn = true;
      this.isScreenSharing = false;
    }

    cacheDom() {
      if (this.cacheReady) return true;
      this.overlay = document.getElementById('vcall-overlay');
      this.remoteVideo = document.getElementById('vcall-remote-video');
      this.localVideo = document.getElementById('vcall-local-video');
      this.remotePlaceholder = document.getElementById('vcall-remote-placeholder');
      this.localPlaceholder = document.getElementById('vcall-local-placeholder');
      this.partnerNameEl = document.getElementById('vcall-name');
      this.statusEl = document.getElementById('vcall-status');
      this.sessionEl = document.getElementById('vcall-sub');
      this.timerEl = document.getElementById('vcall-timer');
      this.callerAvatarEl = document.querySelector('.vcall-caller-av');
      this.selfAvatarEl = document.getElementById('vcall-self-avatar');
      this.micBtn = document.getElementById('vcall-mic');
      this.camBtn = document.getElementById('vcall-cam');
      this.shareBtn = document.getElementById('vcall-share');

      const required = [
        this.overlay,
        this.remoteVideo,
        this.localVideo,
        this.remotePlaceholder,
        this.localPlaceholder,
        this.partnerNameEl,
        this.statusEl,
        this.sessionEl,
        this.timerEl
      ];
      this.cacheReady = required.every(Boolean);
      return this.cacheReady;
    }

    notify(message, duration) {
      if (typeof window.showToast === 'function') window.showToast(message, duration);
    }

    initialsFrom(name) {
      const words = (name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (!words.length) return 'SS';
      return words.map((word) => word[0]).join('').slice(0, 2).toUpperCase();
    }

    setStatus(text) {
      if (this.statusEl) this.statusEl.textContent = text;
    }

    setButtonState(button, icon, stateClass) {
      if (!button) return;
      button.textContent = icon;
      button.classList.remove('is-off', 'is-active');
      if (stateClass) button.classList.add(stateClass);
    }

    syncButtons() {
      this.setButtonState(this.micBtn, this.isMicOn ? '🎙️' : '🔇', this.isMicOn ? '' : 'is-off');
      this.setButtonState(this.camBtn, this.isCamOn ? '📹' : '📷', this.isCamOn ? '' : 'is-off');
      this.setButtonState(this.shareBtn, this.isScreenSharing ? '🛑' : '🖥️', this.isScreenSharing ? 'is-active' : '');
    }

    getLocalVideoTrack() {
      return this.localStream ? this.localStream.getVideoTracks()[0] || null : null;
    }

    getLocalAudioTrack() {
      return this.localStream ? this.localStream.getAudioTracks()[0] || null : null;
    }

    updatePlaceholders() {
      const localTrack = this.getLocalVideoTrack();
      const showLocalPlaceholder = !localTrack || !localTrack.enabled;
      this.localPlaceholder.classList.toggle('hidden', !showLocalPlaceholder);

      const hasRemoteTracks = this.remoteStream && this.remoteStream.getVideoTracks().some((t) => t.readyState === 'live');
      this.remotePlaceholder.classList.toggle('hidden', Boolean(hasRemoteTracks));
    }

    startTimer() {
      this.stopTimer();
      this.seconds = 0;
      this.timerEl.textContent = '00:00';
      this.timerId = window.setInterval(() => {
        this.seconds += 1;
        const minutes = String(Math.floor(this.seconds / 60)).padStart(2, '0');
        const seconds = String(this.seconds % 60).padStart(2, '0');
        this.timerEl.textContent = `${minutes}:${seconds}`;
      }, 1000);
    }

    stopTimer() {
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    }

    async replaceVideoTrack(track) {
      if (!this.videoSender || !track) return;
      await this.videoSender.replaceTrack(track);
    }

    stopTracks(stream) {
      if (!stream) return;
      stream.getTracks().forEach((track) => track.stop());
    }

    closePeerConnections() {
      if (this.pcLocal) {
        this.pcLocal.close();
        this.pcLocal = null;
      }
      if (this.pcRemote) {
        this.pcRemote.close();
        this.pcRemote = null;
      }
      this.videoSender = null;
    }

    async resetSession({ hideOverlay }) {
      this.stopTimer();
      this.stopTracks(this.screenStream);
      this.stopTracks(this.localStream);
      this.stopTracks(this.remoteStream);
      this.screenStream = null;
      this.localStream = null;
      this.remoteStream = null;
      this.closePeerConnections();

      if (this.remoteVideo) this.remoteVideo.srcObject = null;
      if (this.localVideo) this.localVideo.srcObject = null;
      if (this.localVideo) this.localVideo.style.transform = 'scaleX(-1)';
      if (this.remotePlaceholder) this.remotePlaceholder.classList.remove('hidden');
      if (this.localPlaceholder) this.localPlaceholder.classList.remove('hidden');

      this.isMicOn = true;
      this.isCamOn = true;
      this.isScreenSharing = false;
      this.syncButtons();
      if (this.timerEl) this.timerEl.textContent = '00:00';
      this.setStatus('● Connecting…');

      if (hideOverlay && this.overlay) this.overlay.classList.add('hidden');
    }

    async startLocalMedia() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('This browser does not support camera access.');
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      this.localVideo.srcObject = this.localStream;
      this.localVideo.muted = true;
      this.localVideo.playsInline = true;
      this.localVideo.play().catch(() => {});
      this.localPlaceholder.classList.add('hidden');
    }

    async startLoopbackPeer() {
      this.pcLocal = new RTCPeerConnection();
      this.pcRemote = new RTCPeerConnection();
      this.remoteStream = new MediaStream();
      this.remoteVideo.srcObject = this.remoteStream;
      this.remoteVideo.muted = true;
      this.remoteVideo.playsInline = true;

      this.pcLocal.onicecandidate = async (event) => {
        if (!event.candidate) return;
        try {
          await this.pcRemote.addIceCandidate(event.candidate);
        } catch (_) {}
      };

      this.pcRemote.onicecandidate = async (event) => {
        if (!event.candidate) return;
        try {
          await this.pcLocal.addIceCandidate(event.candidate);
        } catch (_) {}
      };

      this.pcRemote.ontrack = (event) => {
        const existingTrackIds = new Set(this.remoteStream.getTracks().map((track) => track.id));
        event.streams[0].getTracks().forEach((track) => {
          if (!existingTrackIds.has(track.id)) this.remoteStream.addTrack(track);
        });
        this.remoteVideo.play().catch(() => {});
        this.updatePlaceholders();
      };

      this.localStream.getTracks().forEach((track) => {
        this.pcLocal.addTrack(track, this.localStream);
      });
      this.videoSender = this.pcLocal.getSenders().find((sender) => sender.track && sender.track.kind === 'video') || null;

      const offer = await this.pcLocal.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await this.pcLocal.setLocalDescription(offer);
      await this.pcRemote.setRemoteDescription(offer);

      const answer = await this.pcRemote.createAnswer();
      await this.pcRemote.setLocalDescription(answer);
      await this.pcLocal.setRemoteDescription(answer);
    }

    async openCall(name, sessionTitle, userName) {
      if (!this.cacheDom()) {
        this.notify('⚠️ Video call UI is missing from this page.');
        return;
      }

      await this.resetSession({ hideOverlay: false });

      const partnerName = name || 'SkillSwap Partner';
      const sessionName = sessionTitle || 'Skill Session';
      const currentUser = userName || (window.APP && window.APP.user ? window.APP.user.name : 'You');

      if (this.callerAvatarEl) this.callerAvatarEl.textContent = this.initialsFrom(partnerName);
      if (this.selfAvatarEl) this.selfAvatarEl.textContent = this.initialsFrom(currentUser);
      this.partnerNameEl.textContent = partnerName;
      this.sessionEl.textContent = sessionName;
      this.setStatus('● Connecting…');
      this.overlay.classList.remove('hidden');
      this.syncButtons();

      try {
        await this.startLocalMedia();
        await this.startLoopbackPeer();
        this.startTimer();
        this.setStatus('● Connected');
        this.updatePlaceholders();
        this.notify('📹 Video call connected.');
      } catch (error) {
        await this.resetSession({ hideOverlay: true });
        this.notify('⚠️ Unable to start camera/microphone. Please allow permissions.');
      }
    }

    async toggleMic(button) {
      const track = this.getLocalAudioTrack();
      if (!track) {
        this.notify('⚠️ Microphone is not available.');
        return;
      }
      track.enabled = !track.enabled;
      this.isMicOn = track.enabled;
      this.syncButtons();
      if (button) this.setButtonState(button, this.isMicOn ? '🎙️' : '🔇', this.isMicOn ? '' : 'is-off');
      this.notify(this.isMicOn ? '🎙️ Microphone unmuted.' : '🔇 Microphone muted.');
    }

    async toggleCamera(button) {
      const track = this.getLocalVideoTrack();
      if (!track) {
        this.notify('⚠️ Camera is not available.');
        return;
      }
      track.enabled = !track.enabled;
      this.isCamOn = track.enabled;
      this.updatePlaceholders();
      this.syncButtons();
      if (button) this.setButtonState(button, this.isCamOn ? '📹' : '📷', this.isCamOn ? '' : 'is-off');
      this.notify(this.isCamOn ? '📹 Camera turned on.' : '📷 Camera turned off.');
    }

    async startScreenShare() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen share is not supported.');
      }
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = this.screenStream.getVideoTracks()[0];
      if (!screenTrack) throw new Error('No screen track available.');

      screenTrack.onended = () => {
        if (this.isScreenSharing) this.stopScreenShare(true);
      };

      await this.replaceVideoTrack(screenTrack);

      const previewStream = new MediaStream([screenTrack]);
      const audioTrack = this.getLocalAudioTrack();
      if (audioTrack) previewStream.addTrack(audioTrack);
      this.localVideo.srcObject = previewStream;
      this.localVideo.style.transform = 'none';
      this.localPlaceholder.classList.add('hidden');
      this.isScreenSharing = true;
      this.syncButtons();
      this.notify('🖥️ Screen sharing started.');
    }

    async stopScreenShare(fromEndedEvent = false) {
      if (!this.isScreenSharing) return;

      const cameraTrack = this.getLocalVideoTrack();
      if (cameraTrack) {
        await this.replaceVideoTrack(cameraTrack);
      }

      this.stopTracks(this.screenStream);
      this.screenStream = null;
      this.isScreenSharing = false;
      this.localVideo.srcObject = this.localStream;
      this.localVideo.style.transform = 'scaleX(-1)';
      this.updatePlaceholders();
      this.syncButtons();
      if (!fromEndedEvent) this.notify('✅ Screen sharing stopped.');
    }

    async toggleScreenShare() {
      if (!this.localStream) {
        this.notify('⚠️ Start a call before screen sharing.');
        return;
      }

      if (this.isScreenSharing) {
        await this.stopScreenShare(false);
      } else {
        try {
          await this.startScreenShare();
        } catch (_) {
          this.notify('⚠️ Screen sharing was canceled.');
        }
      }
    }

    toggleParticipants() {
      const hasRemote = this.remoteStream && this.remoteStream.getTracks().some((track) => track.readyState === 'live');
      const participants = hasRemote ? 2 : 1;
      this.notify(`👥 ${participants} participant${participants > 1 ? 's' : ''} in call.`);
    }

    async endCall(showEndToast = true) {
      if (!this.cacheDom()) return;
      await this.resetSession({ hideOverlay: true });
      if (showEndToast) this.notify("📵 Call ended. Don't forget to leave a review!");
    }
  }

  window.skillSwapVideoCall = new SkillSwapVideoCall();
})();
