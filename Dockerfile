FROM amazonlinux

ENV JAVA_VERSION=8u171
ENV JAVA_BUILD=b11
ENV JAVA_VERSION_WITH_BUILD=${JAVA_VERSION}-${JAVA_BUILD}

# node + yarn
RUN curl --silent --location https://rpm.nodesource.com/setup_8.x | bash -
RUN curl --silent https://dl.yarnpkg.com/rpm/yarn.repo > /etc/yum.repos.d/yarn.repo
RUN yum -y install findutils nodejs npm yarn python27 wget

# java
RUN wget --no-cookies --header "Cookie: gpw_e24=xxx; oraclelicense=accept-securebackup-cookie;" \
"http://download.oracle.com/otn-pub/java/jdk/${JAVA_VERSION_WITH_BUILD}/512cd62ec5174c3487ac17c61aaa89e8/jdk-${JAVA_VERSION}-linux-x64.rpm"
RUN rpm -i jdk-${JAVA_VERSION}-linux-x64.rpm
RUN java -version

# working directory
ADD ./ /code
WORKDIR /code

RUN yarn global add serverless@1.27
RUN yarn install
