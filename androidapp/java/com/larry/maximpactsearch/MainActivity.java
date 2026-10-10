package com.larry.maximpactsearch;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;

import androidx.appcompat.app.AppCompatActivity;


public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SpeechBridge speechBridge;          // NEU: fehlte -> "Symbol nicht gefunden"

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        CookieManager.getInstance().setAcceptCookie(true);

        webView = (WebView) findViewById(R.id.web);

        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);
        webView.getSettings().setDomStorageEnabled(true);

        webView.setLongClickable(true);

        // NEU: Bruecke zur nativen Spracherkennung. Muss VOR loadUrl() stehen,
        // sonst findet die Seite window.AndroidSpeech nicht.
        speechBridge = new SpeechBridge(this, webView);
        webView.addJavascriptInterface(speechBridge, "AndroidSpeech");
webView.addJavascriptInterface(new ShareBridge(this), "AndroidShare");
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onDestroy() {                // NEU: Erkenner freigeben
        if (speechBridge != null) {
            speechBridge.destroy();
        }
        super.onDestroy();
    }


}
