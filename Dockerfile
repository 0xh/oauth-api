FROM amazonlinux

# node + yarn
RUN yum -y groupinstall 'Development Tools'
RUN curl --silent --location https://rpm.nodesource.com/setup_6.x | bash -
RUN curl --silent https://dl.yarnpkg.com/rpm/yarn.repo > /etc/yum.repos.d/yarn.repo
RUN yum -y install nodejs npm yarn python27 wget

# java
RUN wget --no-cookies --header "Cookie: gpw_e24=xxx; oraclelicense=accept-securebackup-cookie;" "http://download.oracle.com/otn-pub/java/jdk/8u151-b12/e758a0de34e24606bca991d704f6dcbf/jre-8u151-linux-x64.rpm"
RUN rpm -Uvh jre-8u151-linux-x64.rpm
RUN java -version

# serverless
RUN npm install -g serverless@1.24.1

# working directory
ADD ./ /code
WORKDIR /code

RUN yarn install