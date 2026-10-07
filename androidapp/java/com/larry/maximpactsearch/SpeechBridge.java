package com.larry.maximpactsearch;   // <- GENAU wie in MainActivity.java (erste Zeile dort)

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.util.ArrayList;

public class SpeechBridge {
    private final Activity activity;
    private final WebView web;
    private SpeechRecognizer recognizer;

    public SpeechBridge(Activity activity, WebView web) {
        this.activity = activity;
        this.web = web;
    }

    @JavascriptInterface
    public void start(final String lang) {
        activity.runOnUiThread(() -> {
            if (ContextCompat.checkSelfPermission(activity, Manifest.permission.RECORD_AUDIO)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(activity,
                        new String[]{Manifest.permission.RECORD_AUDIO}, 1001);
                js("window.onNativeSpeechError('9')");   // Seite zeigt "Berechtigung fehlt", danach nochmal tippen
                return;
            }
            if (!SpeechRecognizer.isRecognitionAvailable(activity)) {
                js("window.onNativeSpeechError('unavailable')");
                return;
            }
            if (recognizer != null) recognizer.destroy();
            recognizer = SpeechRecognizer.createSpeechRecognizer(activity);
            recognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onPartialResults(Bundle b) { send(b, false); }
                @Override public void onResults(Bundle b) { send(b, true); }
                @Override public void onError(int error) { js("window.onNativeSpeechError('" + error + "')"); }
                @Override public void onReadyForSpeech(Bundle params) {}
                @Override public void onBeginningOfSpeech() {}
                @Override public void onRmsChanged(float rmsdB) {}
                @Override public void onBufferReceived(byte[] buffer) {}
                @Override public void onEndOfSpeech() {}
                @Override public void onEvent(int eventType, Bundle params) {}
            });
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            recognizer.startListening(intent);
        });
    }

    @JavascriptInterface
    public void stop() {
        activity.runOnUiThread(() -> { if (recognizer != null) recognizer.stopListening(); });
    }

    public void destroy() {   // in onDestroy() der Activity aufrufen
        if (recognizer != null) { recognizer.destroy(); recognizer = null; }
    }

    private void send(Bundle b, boolean isFinal) {
        ArrayList<String> list = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (list == null || list.isEmpty()) return;
        js("window.onNativeSpeech(" + JSONObject.quote(list.get(0)) + "," + isFinal + ")");
    }

    private void js(final String code) {
        activity.runOnUiThread(() -> web.evaluateJavascript(code, null));
    }
}
