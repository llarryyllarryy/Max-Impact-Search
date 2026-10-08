package com.larry.maximpactsearch;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.EditText;
import android.widget.TextView;

import java.util.Random;

public class QueryActivity extends Activity {

    // true  = open all 5 engines (one browser tab each)
    // false = open one random engine, like the website does
    private static final boolean OPEN_ALL_ENGINES = false;

    private static final String[] ENGINES = {
            "https://www.ecosia.org/search?method=index&q={q}",
            "https://oceanhero.today/web?q={q}",
            "https://rapusia.org/?q={q}",
            "https://gexsi.com/search/?q={q}#gsc.tab=0&gsc.q={q}&gsc.page=1",
            "https://ekoru.org/?q={q}"
    };

    private EditText input;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_query);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE);

        input = (EditText) findViewById(R.id.query_input);
        input.setOnEditorActionListener(new TextView.OnEditorActionListener() {
            @Override
            public boolean onEditorAction(TextView v, int actionId, KeyEvent event) {
                if (actionId == EditorInfo.IME_ACTION_SEARCH
                        || (event != null && event.getKeyCode() == KeyEvent.KEYCODE_ENTER)) {
                    search();
                    return true;
                }
                return false;
            }
        });
        findViewById(R.id.query_go).setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { search(); }
        });
    }

    private void search() {
        String query = input.getText().toString().trim();
        if (query.length() == 0) return;

        String q = Uri.encode(query);               // "clean water" -> "clean%20water"
        if (OPEN_ALL_ENGINES) {
            for (String template : ENGINES) open(template.replace("{q}", q));
        } else {
            open(ENGINES[new Random().nextInt(ENGINES.length)].replace("{q}", q));
        }
        finish();
    }

    private void open(String url) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);   // default browser, not your app's WebView
            startActivity(i);
        } catch (ActivityNotFoundException e) {
            // no browser installed
        }
    }
}