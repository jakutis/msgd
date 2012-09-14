#!/usr/bin/env bash

SQL="$1"

if [ -z "$SQL" ]
then
    echo "Error: SQL query not defined"
    echo
    echo Tables:
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE addr (_id INTEGER PRIMARY KEY,msg_id INTEGER,contact_id INTEGER,address TEXT,type INTEGER,charset INTEGER);"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE android_metadata (locale TEXT);"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE attachments (sms_id INTEGER,content_url TEXT,offset INTEGER);"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE canonical_addresses (_id INTEGER PRIMARY KEY,address TEXT);"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE drm (_id INTEGER PRIMARY KEY,_data TEXT);"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE part (_id INTEGER PRIMARY KEY,mid INTEGER,seq INTEGER DEFAULT 0,ct TEXT,name TEXT,chset INTEGER,cd TEXT,fn TEXT,cid TEXT,cl TEXT,ctt_s INTEGER,ctt_t TEXT,_data TEXT,text TEXT);"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE pdu (_id INTEGER PRIMARY KEY,thread_id INTEGER,date INTEGER,msg_box INTEGER,read INTEGER DEFAULT 0,m_id TEXT,sub TEXT,sub_cs INTEGER,ct_t TEXT,ct_l TEXT,exp INTEGER,m_cls TEXT,m_type INTEGER,v INTEGER,m_size INTEGER,pri INTEGER,rr INTEGER,rpt_a INTEGER,resp_st INTEGER,st INTEGER,tr_id TEXT,retr_st INTEGER,retr_txt TEXT,retr_txt_cs INTEGER,read_status INTEGER,ct_cls INTEGER,resp_txt TEXT,d_tm INTEGER,d_rpt INTEGER,locked INTEGER DEFAULT 0,seen INTEGER DEFAULT 0);"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE pending_msgs (_id INTEGER PRIMARY KEY,proto_type INTEGER,msg_id INTEGER,msg_type INTEGER,err_type INTEGER,err_code INTEGER,retry_index INTEGER NOT NULL DEFAULT 0,due_time INTEGER,last_try INTEGER);"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE rate (sent_time INTEGER);"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE raw (_id INTEGER PRIMARY KEY,date INTEGER,reference_number INTEGER,count INTEGER,sequence INTEGER,destination_port INTEGER,address TEXT,pdu TEXT);"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE sms (_id INTEGER PRIMARY KEY,thread_id INTEGER,address TEXT,person INTEGER,date INTEGER,protocol INTEGER,read INTEGER DEFAULT 0,status INTEGER DEFAULT -1,type INTEGER,reply_path_present INTEGER,subject TEXT,body TEXT,service_center TEXT,locked INTEGER DEFAULT 0,error_code INTEGER DEFAULT 0,seen INTEGER DEFAULT 0);"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE sr_pending (reference_number INTEGER,action TEXT,data TEXT);"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE threads (_id INTEGER PRIMARY KEY,date INTEGER DEFAULT 0,message_count INTEGER DEFAULT 0,recipient_ids TEXT,snippet TEXT,snippet_cs INTEGER DEFAULT 0,read INTEGER DEFAULT 1,type INTEGER DEFAULT 0,error INTEGER DEFAULT 0,has_attachment INTEGER DEFAULT 0);"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE VIRTUAL TABLE words USING FTS3 (_id INTEGER PRIMARY KEY, index_text TEXT, source_id INTEGER, table_to_use INTEGER);"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE 'words_content'(docid INTEGER PRIMARY KEY, 'c0_id', 'c1index_text', 'c2source_id', 'c3table_to_use');"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE 'words_segdir'(level INTEGER,idx INTEGER,start_block INTEGER,leaves_end_block INTEGER,end_block INTEGER,root BLOB,PRIMARY KEY(level, idx));"
    echo "--------------------------------------------------------------------------------"
    echo "CREATE TABLE 'words_segments'(blockid INTEGER PRIMARY KEY, block BLOB);"
    echo "--------------------------------------------------------------------------------"
fi

adb shell sqlite3 /data/data/com.android.providers.telephony/databases/mmssms.db "$SQL"
