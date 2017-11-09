#!/usr/bin/env bash

# install Java JRE
wget --no-cookies --header "Cookie: gpw_e24=xxx; oraclelicense=accept-securebackup-cookie;" "http://download.oracle.com/otn-pub/java/jdk/8u151-b12/e758a0de34e24606bca991d704f6dcbf/jre-8u151-linux-x64.rpm"
sudo rpm -Uvh jre-8u151-linux-x64.rpm
java -version